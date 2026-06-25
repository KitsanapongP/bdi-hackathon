import type { DB } from '../../config/db.js';
import * as repo from './admin.repo.js';
import type { AllowlistInput, DashboardQueryInput, UpdateAllowlistInput } from './admin.schema.js';
import type {
    AllowlistResponse,
    AdminSubmissionTaskRow,
    DashboardDuplicateMemberRow,
    DashboardTeamStatus,
    ExportMemberDocumentRow,
    ExportSubmissionFileRow,
    ExportSubmissionLinkRow,
    ExportSubmittedTeamRow,
    ExportTeamStatus,
    ExportTeamAdvisorRow,
    ExportTeamMemberRow,
    SelectionTeamRow,
} from './admin.types.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors.js';
import { normalizeWallClockToDb } from '../../shared/utils.js';
import path from 'node:path';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { createTeamAuditLog } from '../teams/teams.repo.js';
import * as contentService from '../content/content.service.js';
import * as privilegesService from '../privileges/privileges.service.js';
import { buildMemberDocumentBundleStorageKey, getOrCreateReviewShareId, getOrCreateTeamReviewShareId } from '../public-review/public-review.service.js';

const GLOBAL_SELECTION_CONFIRM_OPEN_AT_KEY = 'GLOBAL_SELECTION_CONFIRM_OPEN_AT';
const GLOBAL_SELECTION_CONFIRM_CLOSE_AT_KEY = 'GLOBAL_SELECTION_CONFIRM_CLOSE_AT';
import { PDFDocument } from 'pdf-lib';

interface TeamExportBundle {
    team: ExportSubmittedTeamRow;
    advisors: ExportTeamAdvisorRow[];
    members: ExportTeamMemberRow[];
}

const TEAM_STATUS_SET = new Set<ExportTeamStatus>([
    'forming',
    'submitted',
    'passed',
    'failed',
    'confirmed',
    'not_joined',
    'disbanded',
]);

type SubmissionReviewTrack = 'Phenome' | 'Health' | 'City';
type ReviewWorkSlot = 'work_1' | 'work_2';

const PRESENTATION_VIDEO_TASK_NAME = 'ส่งวิดีโอนำเสนอผลงาน';

const REVIEW_WORK_TASK_NAMES: Record<ReviewWorkSlot, string> = {
    work_1: 'ส่งผลงานลำดับที่ 1',
    work_2: 'ส่งผลงานลำดับที่ 2',
};

function normalizeStatuses(values: string[]): ExportTeamStatus[] {
    const uniqueStatuses: ExportTeamStatus[] = [];
    for (const value of values) {
        const status = String(value || '').trim() as ExportTeamStatus;
        if (!TEAM_STATUS_SET.has(status)) continue;
        if (uniqueStatuses.includes(status)) continue;
        uniqueStatuses.push(status);
    }
    return uniqueStatuses;
}

function getReviewWorkSlot(taskName: string | null): ReviewWorkSlot | null {
    const normalized = String(taskName || '').trim();
    if (normalized === REVIEW_WORK_TASK_NAMES.work_1) return 'work_1';
    if (normalized === REVIEW_WORK_TASK_NAMES.work_2) return 'work_2';
    return null;
}

function isPresentationVideoTask(taskName: string | null): boolean {
    return String(taskName || '').trim() === PRESENTATION_VIDEO_TASK_NAME;
}

function buildPublicReviewUrl(baseUrl: string, shareId: string): string {
    const safeBase = String(baseUrl || '').replace(/\/$/, '');
    return `${safeBase}/api/public-review/files/${shareId}`;
}

function buildPublicTeamReviewPageUrl(baseUrl: string, shareId: string): string {
    const safeBase = String(baseUrl || '').replace(/\/$/, '');
    return `${safeBase}/review/team/${shareId}`;
}

function buildPublicTeamIdentityReviewPageUrl(baseUrl: string, shareId: string): string {
    const safeBase = String(baseUrl || '').replace(/\/$/, '');
    return `${safeBase}/review/identity/${shareId}`;
}

function buildAdminTeamSubmissionsPageUrl(baseUrl: string, teamId: number): string {
    const safeBase = String(baseUrl || '').replace(/\/$/, '');
    return `${safeBase}/admin/submissions?teamId=${encodeURIComponent(String(teamId))}`;
}

function pickMemberDisplayName(member: ExportTeamMemberRow): string {
    const th = `${member.first_name_th || ''} ${member.last_name_th || ''}`.trim();
    const en = `${member.first_name_en || ''} ${member.last_name_en || ''}`.trim();
    return th || en || member.user_name || `user-${member.user_id}`;
}

function toAllowlistResponse(row: any): AllowlistResponse {
    return {
        allowId: row.allow_id,
        userId: row.user_id,
        accessRole: row.access_role,
        isActive: row.is_active === 1,
        note: row.note,
        grantedAt: row.granted_at.toISOString(),
        grantedByUserId: row.granted_by_user_id,
    };
}

export async function getAllowlist(db: DB): Promise<AllowlistResponse[]> {
    const rows = await repo.getAllAllowlist(db);
    return rows.map(toAllowlistResponse);
}

export async function createAllowlistEntry(
    db: DB,
    input: AllowlistInput,
    grantedByUserId: number
): Promise<AllowlistResponse> {
    const exists = await repo.userExistsInAllowlist(db, input.userId);
    if (exists) {
        throw new ConflictError('ผู้ใช้นี้มีสิทธิ์ในระบบอยู่แล้ว (กรุณาแก้ไขข้อมูลเดิมแทนการสร้างใหม่)');
    }

    const allowId = await repo.createAllowlist(db, input, grantedByUserId);
    const row = await repo.getAllowlistById(db, allowId);
    return toAllowlistResponse(row!);
}

export async function updateAllowlistEntry(
    db: DB,
    allowId: number,
    input: UpdateAllowlistInput
): Promise<AllowlistResponse> {
    const existing = await repo.getAllowlistById(db, allowId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลสิทธิ์นี้ในระบบ');
    }

    await repo.updateAllowlist(db, allowId, input);

    const updated = await repo.getAllowlistById(db, allowId);
    return toAllowlistResponse(updated!);
}

function normalizeName(value: string): string {
    return value
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function pickDisplayName(member: DashboardDuplicateMemberRow) {
    const th = `${member.first_name_th ?? ''} ${member.last_name_th ?? ''}`.trim();
    const en = `${member.first_name_en ?? ''} ${member.last_name_en ?? ''}`.trim();
    const best = th || en;
    return {
        normalized: normalizeName(best),
        fullNameTh: th || null,
        fullNameEn: en || null,
    };
}

export async function getDashboardOverview(db: DB, input: DashboardQueryInput) {
    const totalTeams = await repo.getDashboardTotalTeams(db);
    const submittedOrApproved = await repo.getDashboardSubmittedOrApprovedCount(db);

    const [
        statusCountsRows,
        teamMemberCounts,
        genderCountsRows,
        provinceCountsRows,
        educationLevelRows,
        institutionRows,
        systemCloseDeadlines,
        trendRows,
        duplicateMembers,
        participationOverview,
    ] = await Promise.all([
        repo.getDashboardStatusCounts(db),
        repo.getDashboardTeamMemberCounts(db),
        repo.getDashboardGenderCounts(db),
        repo.getDashboardProvinceCounts(db),
        repo.getDashboardEducationLevelCounts(db),
        repo.getDashboardInstitutionCounts(db),
        repo.getDashboardSystemCloseDeadlines(db),
        repo.getDashboardTrend(db, input.days),
        repo.getDashboardDuplicateMembers(db),
        contentService.getParticipationOverview(db),
    ]);

    const statusMap = new Map<DashboardTeamStatus, number>([
        ['forming', 0],
        ['submitted', 0],
        ['passed', 0],
        ['failed', 0],
        ['confirmed', 0],
        ['not_joined', 0],
        ['disbanded', 0],
    ]);
    statusCountsRows.forEach((row) => {
        statusMap.set(row.status, Number(row.count));
    });

    const filteredTeams = teamMemberCounts.length;
    const totalMembers = teamMemberCounts.reduce((sum, row) => sum + Number(row.member_count), 0);

    const teamSizeBuckets = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5+': 0,
    };

    for (const row of teamMemberCounts) {
        const size = Number(row.member_count);
        if (size >= 5) {
            teamSizeBuckets['5+'] += 1;
        } else {
            const key = String(Math.max(1, size)) as '1' | '2' | '3' | '4';
            teamSizeBuckets[key] += 1;
        }
    }

    const genderCounts = {
        male: 0,
        female: 0,
        other: 0,
        unknown: 0,
    };

    genderCountsRows.forEach((row) => {
        const key = (row.gender ?? 'unknown') as keyof typeof genderCounts;
        if (genderCounts[key] !== undefined) {
            genderCounts[key] += Number(row.count);
        } else {
            genderCounts.unknown += Number(row.count);
        }
    });

    const provinceCounts = provinceCountsRows
        .filter((row) => row.province && row.province.trim())
        .map((row) => ({
            province: row.province as string,
            count: Number(row.count),
        }));

    const educationLevelCounts = educationLevelRows.map((row) => ({
        educationLevel: row.education_level || 'unknown',
        count: Number(row.count),
    }));

    const institutionCounts = institutionRows.map((row) => ({
        institutionName: row.institution_name || 'ไม่ระบุ',
        count: Number(row.count),
    }));

    const duplicatesByName = new Map<string, {
        normalizedName: string;
        fullNameTh: string | null;
        fullNameEn: string | null;
        members: Array<{
            userId: number;
            userName: string;
            teamId: number;
            teamCode: string;
            teamName: string;
            status: DashboardTeamStatus;
        }>;
    }>();

    duplicateMembers.forEach((member) => {
        const name = pickDisplayName(member);
        if (!name.normalized) return;

        const bucket = duplicatesByName.get(name.normalized) ?? {
            normalizedName: name.normalized,
            fullNameTh: name.fullNameTh,
            fullNameEn: name.fullNameEn,
            members: [],
        };

        bucket.members.push({
            userId: member.user_id,
            userName: member.user_name,
            teamId: member.team_id,
            teamCode: member.team_code,
            teamName: member.team_name,
            status: member.status,
        });

        duplicatesByName.set(name.normalized, bucket);
    });

    const duplicateNames = Array.from(duplicatesByName.values())
        .filter((item) => item.members.length > 1)
        .sort((a, b) => b.members.length - a.members.length)
        .map((item) => ({
            normalizedName: item.normalizedName,
            fullNameTh: item.fullNameTh,
            fullNameEn: item.fullNameEn,
            count: item.members.length,
            members: item.members,
        }));

    return {
        filters: {
            days: input.days,
        },
        totals: {
            teamsCreated: totalTeams,
            teamsInSelectedStatuses: filteredTeams,
            teamsActive: filteredTeams,
            submittedOrApproved,
            totalMembersInSelectedStatuses: totalMembers,
            teamsConfirmed: statusMap.get('confirmed') ?? 0,
            teamsNotJoined: statusMap.get('not_joined') ?? 0,
            teamsDisbanded: statusMap.get('disbanded') ?? 0,
        },
        statusCounts: [
            { status: 'forming', count: statusMap.get('forming') ?? 0 },
            { status: 'submitted', count: statusMap.get('submitted') ?? 0 },
            { status: 'passed', count: statusMap.get('passed') ?? 0 },
            { status: 'failed', count: statusMap.get('failed') ?? 0 },
            { status: 'confirmed', count: statusMap.get('confirmed') ?? 0 },
            { status: 'not_joined', count: statusMap.get('not_joined') ?? 0 },
            { status: 'disbanded', count: statusMap.get('disbanded') ?? 0 },
        ],
        teamSizeBuckets: Object.entries(teamSizeBuckets).map(([bucket, count]) => ({ bucket, count })),
        genderCounts: Object.entries(genderCounts).map(([gender, count]) => ({ gender, count })),
        provinceCounts,
        educationLevelCounts,
        institutionCounts,
        submissionTrend: trendRows.map((row) => ({
            date: row.date_label,
            submitted: Number(row.submitted),
            passed: Number(row.passed),
            failed: Number(row.failed),
        })),
        participation: {
            interestedParticipants: Number(participationOverview?.totals?.interestedParticipants || 0),
            trend: participationOverview?.trend || { weekly: [], monthly: [] },
            generatedAt: participationOverview?.generatedAt || null,
        },
        systemCloseDeadlines: systemCloseDeadlines.map((item) => ({
            key: item.config_key,
            label: item.description_th || item.description_en || item.config_key,
            closeAt: item.config_value,
            updatedAt: item.updated_at instanceof Date ? item.updated_at.toISOString() : String(item.updated_at),
        })),
        duplicateNames,
    };
}

const VERIFICATION_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'verification');

function sanitizeFileSegment(value: string, fallback: string): string {
    const cleaned = String(value || '')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_');
    return cleaned || fallback;
}

function truncateText(value: string, maxLength: number): string {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (normalized.length <= maxLength) return normalized;
    return normalized.slice(0, Math.max(0, maxLength)).trim();
}

function buildMergedMemberPdfName(
    memberOrder: number,
    firstNameRaw: string,
    lastNameRaw: string,
    originalStemRaw: string,
    userId: number,
): string {
    const maxBaseLength = 120; // keep below common OS filename limits
    const orderText = String(Math.max(1, Math.floor(memberOrder || 1))).padStart(2, '0');
    const firstName = truncateText(sanitizeFileSegment(firstNameRaw, `user${userId}`), 32) || `user${userId}`;
    const lastName = truncateText(sanitizeFileSegment(lastNameRaw, 'member'), 32) || 'member';
    const stemBudget = Math.max(20, maxBaseLength - orderText.length - firstName.length - lastName.length - 3);
    const originalStem = truncateText(sanitizeFileSegment(originalStemRaw, 'document'), stemBudget) || 'document';
    const baseName = `${orderText}_${firstName}_${lastName}_${originalStem}`;
    return `${truncateText(baseName, maxBaseLength)}.pdf`;
}

function formatDateTime(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

function stripFileExtension(fileName: string): string {
    const trimmed = String(fileName || '').trim();
    if (!trimmed) return 'document';
    const parsed = path.parse(trimmed);
    return parsed.name || trimmed;
}

function pickMemberName(document: ExportMemberDocumentRow): { firstName: string; lastName: string } {
    const firstName = document.first_name_th || document.first_name_en || document.user_name || `user${document.user_id}`;
    const lastName = document.last_name_th || document.last_name_en || '';
    return { firstName, lastName };
}

function resolveAbsolutePathFromStorageKey(storageKey: string): string | null {
    const normalizedStorageKey = String(storageKey || '').replace(/\\/g, '/');
    const candidates = [
        path.join(process.cwd(), 'public', normalizedStorageKey.replace(/^\/+/, '')),
        path.join(process.cwd(), 'public', normalizedStorageKey),
        path.join(VERIFICATION_UPLOADS_DIR, normalizedStorageKey.replace(/^verification\//, '')),
        path.join(VERIFICATION_UPLOADS_DIR, normalizedStorageKey.replace(/^uploads\/verification\//, '')),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }

    return null;
}

async function mergeMemberDocumentsToPdf(documents: ExportMemberDocumentRow[]): Promise<Buffer | null> {
    if (documents.length === 0) return null;

    const merged = await PDFDocument.create();
    let copiedPageCount = 0;

    for (const document of documents) {
        const absolutePath = resolveAbsolutePathFromStorageKey(document.file_storage_key);
        if (!absolutePath) continue;

        const bytes = fs.readFileSync(absolutePath);
        const source = await PDFDocument.load(bytes);
        const pageIndices = source.getPageIndices();
        const copiedPages = await merged.copyPages(source, pageIndices);
        copiedPages.forEach((page) => merged.addPage(page));
        copiedPageCount += copiedPages.length;
    }

    if (copiedPageCount === 0) return null;

    const mergedBytes = await merged.save();
    return Buffer.from(mergedBytes);
}

function buildUniqueZipFileName(fileName: string, usedNames: Set<string>): string {
    const parsed = path.parse(fileName);
    const base = sanitizeFileSegment(parsed.name || 'file', 'file') || 'file';
    const ext = sanitizeFileSegment(parsed.ext || '', '').replace(/_/g, '') || '.bin';

    let candidate = `${base}${ext}`;
    let counter = 2;
    while (usedNames.has(candidate.toLowerCase())) {
        candidate = `${base}_${counter}${ext}`;
        counter += 1;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
}

function buildAdvisorDisplayNameTh(advisor: ExportTeamAdvisorRow): string {
    return [advisor.prefix, advisor.first_name_th, advisor.last_name_th].filter(Boolean).join(' ').trim();
}

function buildAdvisorDisplayNameEn(advisor: ExportTeamAdvisorRow): string {
    return [advisor.first_name_en, advisor.last_name_en].filter(Boolean).join(' ').trim();
}

async function buildTeamWorkbookBuffer(bundle: TeamExportBundle): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const teamSheet = workbook.addWorksheet('team_summary');
    const memberSheet = workbook.addWorksheet('member_details');

    teamSheet.columns = [
        { header: 'team_id', key: 'team_id' },
        { header: 'team_code', key: 'team_code' },
        { header: 'team_name_th', key: 'team_name_th' },
        { header: 'team_name_en', key: 'team_name_en' },
        { header: 'team_status', key: 'team_status' },
        { header: 'visibility', key: 'visibility' },
        { header: 'leader_user_id', key: 'leader_user_id' },
        { header: 'video_link', key: 'video_link' },
        { header: 'advisor_name_th', key: 'advisor_name_th' },
        { header: 'advisor_name_en', key: 'advisor_name_en' },
        { header: 'advisor_email', key: 'advisor_email' },
        { header: 'advisor_phone', key: 'advisor_phone' },
        { header: 'advisor_institution_name_th', key: 'advisor_institution_name_th' },
        { header: 'confirmation_deadline_at', key: 'confirmation_deadline_at' },
        { header: 'confirmed_at', key: 'confirmed_at' },
        { header: 'confirmed_by_user_id', key: 'confirmed_by_user_id' },
        { header: 'created_at', key: 'created_at' },
        { header: 'updated_at', key: 'updated_at' },
    ];

    memberSheet.columns = [
        { header: 'team_id', key: 'team_id' },
        { header: 'team_code', key: 'team_code' },
        { header: 'team_name_th', key: 'team_name_th' },
        { header: 'team_name_en', key: 'team_name_en' },
        { header: 'team_status', key: 'team_status' },
        { header: 'user_id', key: 'user_id' },
        { header: 'user_name', key: 'user_name' },
        { header: 'role', key: 'role' },
        { header: 'member_status', key: 'member_status' },
        { header: 'joined_at', key: 'joined_at' },
        { header: 'left_at', key: 'left_at' },
        { header: 'member_order', key: 'member_order' },
        { header: 'first_name_th', key: 'first_name_th' },
        { header: 'last_name_th', key: 'last_name_th' },
        { header: 'first_name_en', key: 'first_name_en' },
        { header: 'last_name_en', key: 'last_name_en' },
        { header: 'email', key: 'email' },
        { header: 'phone', key: 'phone' },
        { header: 'institution_name_th', key: 'institution_name_th' },
        { header: 'institution_name_en', key: 'institution_name_en' },
        { header: 'gender', key: 'gender' },
        { header: 'birth_date', key: 'birth_date' },
        { header: 'education_level', key: 'education_level' },
        { header: 'home_province', key: 'home_province' },
        { header: 'verify_round_id', key: 'verify_round_id' },
        { header: 'is_profile_complete', key: 'is_profile_complete' },
        { header: 'is_member_confirmed', key: 'is_member_confirmed' },
        { header: 'member_confirmed_at', key: 'member_confirmed_at' },
        { header: 'member_unconfirmed_at', key: 'member_unconfirmed_at' },
        { header: 'profile_completed_at', key: 'profile_completed_at' },
        { header: 'profile_updated_at', key: 'profile_updated_at' },
    ];

    const advisorNamesTh = bundle.advisors.map(buildAdvisorDisplayNameTh).filter(Boolean).join('; ');
    const advisorNamesEn = bundle.advisors.map(buildAdvisorDisplayNameEn).filter(Boolean).join('; ');
    const advisorEmails = bundle.advisors.map((advisor) => advisor.email).filter(Boolean).join('; ');
    const advisorPhones = bundle.advisors.map((advisor) => advisor.phone).filter(Boolean).join('; ');
    const advisorInstitutions = bundle.advisors.map((advisor) => advisor.institution_name_th).filter(Boolean).join('; ');

    teamSheet.addRow({
        team_id: bundle.team.team_id,
        team_code: bundle.team.team_code,
        team_name_th: bundle.team.team_name_th,
        team_name_en: bundle.team.team_name_th,
        team_status: bundle.team.status,
        visibility: bundle.team.visibility,
        leader_user_id: bundle.team.current_leader_user_id,
        video_link: bundle.team.video_link || '',
        advisor_name_th: advisorNamesTh,
        advisor_name_en: advisorNamesEn,
        advisor_email: advisorEmails,
        advisor_phone: advisorPhones,
        advisor_institution_name_th: advisorInstitutions,
        confirmation_deadline_at: formatDateTime(bundle.team.confirmation_deadline_at),
        confirmed_at: formatDateTime(bundle.team.confirmed_at),
        confirmed_by_user_id: bundle.team.confirmed_by_user_id ?? '',
        created_at: formatDateTime(bundle.team.created_at),
        updated_at: formatDateTime(bundle.team.updated_at),
    });

    for (const member of bundle.members) {
        memberSheet.addRow({
            team_id: member.team_id,
            team_code: member.team_code,
            team_name_th: member.team_name_th,
            team_name_en: member.team_name_th,
            team_status: member.team_status,
            user_id: member.user_id,
            user_name: member.user_name,
            role: member.role,
            member_status: member.member_status,
            member_order: member.member_order,
            joined_at: formatDateTime(member.joined_at),
            left_at: formatDateTime(member.left_at),
            first_name_th: member.first_name_th || '',
            last_name_th: member.last_name_th || '',
            first_name_en: member.first_name_en || '',
            last_name_en: member.last_name_en || '',
            email: member.email || '',
            phone: member.phone || '',
            institution_name_th: member.institution_name_th || '',
            institution_name_en: member.institution_name_en || '',
            gender: member.gender || '',
            birth_date: member.birth_date || '',
            education_level: member.education_level || '',
            home_province: member.home_province || '',
            verify_round_id: member.verify_round_id ?? '',
            is_profile_complete: member.is_profile_complete ?? '',
            is_member_confirmed: member.is_member_confirmed ?? '',
            member_confirmed_at: formatDateTime(member.member_confirmed_at),
            member_unconfirmed_at: formatDateTime(member.member_unconfirmed_at),
            profile_completed_at: formatDateTime(member.profile_completed_at),
            profile_updated_at: formatDateTime(member.profile_updated_at),
        });
    }

    const rawBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer as ArrayBuffer);
}

export async function exportSubmittedVerificationBundle(db: DB): Promise<{ fileName: string; stream: PassThrough }> {
    const teams = await repo.getSubmittedTeamsForExport(db);
    if (teams.length === 0) {
        throw new NotFoundError('ไม่พบทีมสถานะ submitted สำหรับ export');
    }

    const teamIds = teams.map((team) => team.team_id);
    const [advisors, members, memberDocuments, submissionFiles] = await Promise.all([
        repo.getTeamAdvisorsForExport(db, teamIds),
        repo.getTeamMembersForExport(db, teamIds),
        repo.getMemberDocumentsForExport(db, teamIds),
        repo.getSubmissionFilesForExport(db, teamIds),
    ]);

    const advisorsByTeam = new Map<number, ExportTeamAdvisorRow[]>();
    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();
    const documentsByTeamAndUser = new Map<string, ExportMemberDocumentRow[]>();
    const submissionFilesByTeam = new Map<number, ExportSubmissionFileRow[]>();

    for (const advisor of advisors) {
        const bucket = advisorsByTeam.get(advisor.team_id) ?? [];
        bucket.push(advisor);
        advisorsByTeam.set(advisor.team_id, bucket);
    }

    for (const member of members) {
        const bucket = membersByTeam.get(member.team_id) ?? [];
        bucket.push(member);
        membersByTeam.set(member.team_id, bucket);
    }

    for (const document of memberDocuments) {
        const key = `${document.team_id}:${document.user_id}`;
        const bucket = documentsByTeamAndUser.get(key) ?? [];
        bucket.push(document);
        documentsByTeamAndUser.set(key, bucket);
    }

    for (const submissionFile of submissionFiles) {
        const bucket = submissionFilesByTeam.get(submissionFile.team_id) ?? [];
        bucket.push(submissionFile);
        submissionFilesByTeam.set(submissionFile.team_id, bucket);
    }

    const output = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('warning', (err) => {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            output.destroy(err);
        }
    });
    archive.on('error', (err) => output.destroy(err));
    archive.pipe(output);

    for (const team of teams) {
        const exportFolderName = sanitizeFileSegment(
            `${team.team_code}_${team.team_name_th || `team-${team.team_id}`}`,
            `team_${team.team_id}`,
        );
        const bundle: TeamExportBundle = {
            team,
            advisors: advisorsByTeam.get(team.team_id) ?? [],
            members: membersByTeam.get(team.team_id) ?? [],
        };

        const submissionFiles = submissionFilesByTeam.get(team.team_id) ?? [];
        const usedSubmissionFileNames = new Set<string>();
        for (const submissionFile of submissionFiles) {
            const absolutePath = resolveAbsolutePathFromStorageKey(submissionFile.file_storage_key);
            if (!absolutePath) continue;
            const desiredName = submissionFile.file_original_name || path.basename(absolutePath);
            const uniqueName = buildUniqueZipFileName(desiredName, usedSubmissionFileNames);
            archive.file(absolutePath, {
                name: `${exportFolderName}/submission_files/${uniqueName}`,
            });
        }

        const teamMembers = membersByTeam.get(team.team_id) ?? [];
        for (const member of teamMembers) {
            const docs = documentsByTeamAndUser.get(`${team.team_id}:${member.user_id}`) ?? [];
            if (docs.length === 0) continue;

            const sortedDocs = [...docs].sort((a, b) => {
                const left = new Date(a.uploaded_at).getTime();
                const right = new Date(b.uploaded_at).getTime();
                return left - right;
            });
            const firstDocument = sortedDocs[0];
            if (!firstDocument) continue;
            const mergedPdf = await mergeMemberDocumentsToPdf(sortedDocs);
            if (!mergedPdf) continue;

            const { firstName, lastName } = pickMemberName(firstDocument);
            const originalFileStem = stripFileExtension(firstDocument.file_original_name);
            const mergedFileName = buildMergedMemberPdfName(
                member.member_order,
                firstName,
                lastName || 'member',
                originalFileStem,
                member.user_id,
            );

            archive.append(mergedPdf, {
                name: `${exportFolderName}/members/${mergedFileName}`,
            });
        }

        const workbookBuffer = await buildTeamWorkbookBuffer(bundle);
        const xlsxName = `${sanitizeFileSegment(
            `${team.team_code}_${team.team_name_th || `team-${team.team_id}`}`,
            `team_${team.team_id}`,
        )}_member_personal_data.xlsx`;
        archive.append(workbookBuffer, { name: `${exportFolderName}/${xlsxName}` });
    }

    void archive.finalize();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    return {
        fileName: `verification_export_${timestamp}.zip`,
        stream: output,
    };
}

export async function exportTeamsSelectionSheet(
    db: DB,
    inputStatuses: string[],
    publicBaseUrl: string,
): Promise<{ fileName: string; stream: PassThrough }> {
    const statuses = normalizeStatuses(inputStatuses);
    if (statuses.length === 0) {
        throw new BadRequestError('กรุณาเลือกสถานะทีมอย่างน้อย 1 สถานะ');
    }

    const teams = await repo.getTeamsForSheetExport(db, statuses);
    if (teams.length === 0) {
        throw new NotFoundError('ไม่พบข้อมูลทีมตามสถานะที่เลือก');
    }

    const teamIds = teams.map((team) => team.team_id);
    const [advisors, members, memberDocuments, submissionFiles, submissionLinks] = await Promise.all([
        repo.getTeamAdvisorsForExport(db, teamIds),
        repo.getTeamMembersForExport(db, teamIds),
        repo.getMemberDocumentsForExport(db, teamIds),
        repo.getSubmissionFilesForExport(db, teamIds),
        repo.getSubmissionLinksForExport(db, teamIds),
    ]);

    const advisorsByTeam = new Map<number, ExportTeamAdvisorRow[]>();
    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();
    const submissionFilesByTeam = new Map<number, ExportSubmissionFileRow[]>();
    const submissionLinksByTeam = new Map<number, ExportSubmissionLinkRow[]>();
    const documentsByTeam = new Map<number, ExportMemberDocumentRow[]>();

    for (const row of advisors) {
        const bucket = advisorsByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        advisorsByTeam.set(row.team_id, bucket);
    }
    for (const row of members) {
        const bucket = membersByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        membersByTeam.set(row.team_id, bucket);
    }
    for (const row of submissionFiles) {
        const bucket = submissionFilesByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        submissionFilesByTeam.set(row.team_id, bucket);
    }
    for (const row of submissionLinks) {
        const bucket = submissionLinksByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        submissionLinksByTeam.set(row.team_id, bucket);
    }
    for (const row of memberDocuments) {
        const bucket = documentsByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        documentsByTeam.set(row.team_id, bucket);
    }

    const memberNameToTeamSet = new Map<string, Set<number>>();
    for (const member of members) {
        const normalized = pickMemberDisplayName(member).trim().toLowerCase().replace(/\s+/g, ' ');
        if (!normalized) continue;
        const bucket = memberNameToTeamSet.get(normalized) ?? new Set<number>();
        bucket.add(member.team_id);
        memberNameToTeamSet.set(normalized, bucket);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('teams_selection_export');
    const maxSubmissionFiles = Math.max(0, ...teams.map((team) => (submissionFilesByTeam.get(team.team_id) ?? []).length));
    const maxVideoLinks = Math.max(
        0,
        ...teams.map((team) => {
            const taskLinks = submissionLinksByTeam.get(team.team_id) ?? [];
            return taskLinks.length;
        }),
    );

    const baseColumns: Array<{ header: string; key: string; width: number }> = [
        { header: 'team_id', key: 'team_id', width: 12 },
        { header: 'team_code', key: 'team_code', width: 14 },
        { header: 'team_name_th', key: 'team_name_th', width: 26 },
        { header: 'team_name_en', key: 'team_name_en', width: 26 },
        { header: 'team_status', key: 'team_status', width: 14 },
    ];

    const memberColumns: Array<{ header: string; key: string; width: number }> = [];
    for (let index = 1; index <= 5; index += 1) {
        memberColumns.push(
            { header: `member_${index}_name`, key: `member_${index}_name`, width: 24 },
            { header: `member_${index}_profile`, key: `member_${index}_profile`, width: 34 },
            { header: `member_${index}_document_link`, key: `member_${index}_document_link`, width: 30 },
        );
    }

    const videoColumns = Array.from({ length: maxVideoLinks }).map((_, index) => ({
        header: `video_link_${index + 1}`,
        key: `video_link_${index + 1}`,
        width: 30,
    }));
    const submissionColumns = Array.from({ length: maxSubmissionFiles }).map((_, index) => ({
        header: `submission_file_${index + 1}`,
        key: `submission_file_${index + 1}`,
        width: 44,
    }));

    const tailColumns: Array<{ header: string; key: string; width: number }> = [
        { header: 'leader_user_name', key: 'leader_user_name', width: 24 },
        { header: 'member_count', key: 'member_count', width: 12 },
        { header: 'advisor_names', key: 'advisor_names', width: 26 },
        { header: 'advisor_contacts', key: 'advisor_contacts', width: 28 },
        { header: 'duplicate_member_flag', key: 'duplicate_member_flag', width: 16 },
        { header: 'created_at', key: 'created_at', width: 20 },
        { header: 'updated_at', key: 'updated_at', width: 20 },
    ];

    sheet.columns = [...baseColumns, ...videoColumns, ...submissionColumns, ...memberColumns, ...tailColumns];

    const hyperlinkStyle: Partial<ExcelJS.Font> = {
        color: { argb: 'FF0563C1' },
        underline: true,
    };

    for (const team of teams) {
        const teamMembers = [...(membersByTeam.get(team.team_id) ?? [])].sort((a, b) => a.member_order - b.member_order);
        const teamAdvisors = advisorsByTeam.get(team.team_id) ?? [];
        const teamSubmissionFiles = submissionFilesByTeam.get(team.team_id) ?? [];
        const teamSubmissionLinks = submissionLinksByTeam.get(team.team_id) ?? [];
        const teamDocuments = documentsByTeam.get(team.team_id) ?? [];
        const leader = teamMembers.find((member) => member.role === 'leader') || teamMembers[0] || null;
        const leaderDisplayName = leader ? pickMemberDisplayName(leader) : (team.leader_user_name || '');
        const hasDuplicate = teamMembers.some((member) => {
            const normalized = pickMemberDisplayName(member).trim().toLowerCase().replace(/\s+/g, ' ');
            if (!normalized) return false;
            return (memberNameToTeamSet.get(normalized)?.size || 0) > 1;
        });

        const docsByUser = new Map<number, ExportMemberDocumentRow[]>();
        for (const doc of teamDocuments) {
            const bucket = docsByUser.get(doc.user_id) ?? [];
            bucket.push(doc);
            docsByUser.set(doc.user_id, bucket);
        }

        const row = sheet.addRow({
            team_id: team.team_id,
            team_code: team.team_code,
            team_name_th: team.team_name_th || '',
            team_name_en: team.team_name_th || '',
            team_status: team.status,
            leader_user_name: leaderDisplayName,
            member_count: teamMembers.length,
            advisor_names: teamAdvisors.map((advisor) => buildAdvisorDisplayNameTh(advisor) || buildAdvisorDisplayNameEn(advisor)).filter(Boolean).join(', '),
            advisor_contacts: teamAdvisors
                .map((advisor) => [advisor.email || '', advisor.phone || ''].filter(Boolean).join(' / '))
                .filter(Boolean)
                .join(', '),
            duplicate_member_flag: hasDuplicate ? 'YES' : 'NO',
            created_at: formatDateTime(team.created_at),
            updated_at: formatDateTime(team.updated_at),
        });

        row.getCell('advisor_names').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('advisor_contacts').alignment = { wrapText: true, vertical: 'top' };

        for (let index = 0; index < 5; index += 1) {
            const member = teamMembers[index] || null;
            const nameKey = `member_${index + 1}_name`;
            const profileKey = `member_${index + 1}_profile`;
            const docKey = `member_${index + 1}_document_link`;

            if (!member) {
                row.getCell(nameKey).value = '';
                row.getCell(profileKey).value = '';
                row.getCell(docKey).value = '';
                continue;
            }

            row.getCell(nameKey).value = pickMemberDisplayName(member);
            row.getCell(profileKey).value = [
                `Email: ${member.email || '-'}`,
                `Phone: ${member.phone || '-'}`,
                `Institution: ${member.institution_name_th || member.institution_name_en || '-'}`,
                `Gender: ${member.gender || '-'}`,
                `Home Province: ${member.home_province || '-'}`,
                `Education: ${member.education_level || '-'}`,
            ].join('\n');
            row.getCell(profileKey).alignment = { wrapText: true, vertical: 'top' };

            const memberDocs = [...(docsByUser.get(member.user_id) ?? [])].sort(
                (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
            );
            if (memberDocs.length > 0) {
                const shareId = await getOrCreateReviewShareId(db, {
                    storageKey: buildMemberDocumentBundleStorageKey(team.team_id, member.user_id),
                    fileKind: 'member_document',
                    fileOriginalName: `member_docs_bundle_team_${team.team_id}_member_${member.user_id}.pdf`,
                });
                const label = `Open ID Bundle (${memberDocs.length} files)`;
                const docCell = row.getCell(docKey);
                docCell.value = {
                    text: label,
                    hyperlink: buildPublicReviewUrl(publicBaseUrl, shareId),
                };
                docCell.font = hyperlinkStyle;
            } else {
                row.getCell(docKey).value = '';
            }
        }

        for (let index = 0; index < maxVideoLinks; index += 1) {
            const link = teamSubmissionLinks[index];
            const href = link?.link_url || '';
            const videoKey = `video_link_${index + 1}`;
            if (href) {
                const videoCell = row.getCell(videoKey);
                videoCell.value = {
                    text: link?.task_name ? `Open ${link.task_name}` : 'Open Video',
                    hyperlink: href,
                };
                videoCell.font = hyperlinkStyle;
            } else {
                row.getCell(videoKey).value = '';
            }
        }

        for (let index = 0; index < maxSubmissionFiles; index += 1) {
            const file = teamSubmissionFiles[index];
            const key = `submission_file_${index + 1}`;
            if (!file) {
                row.getCell(key).value = '';
                continue;
            }
            const shareId = await getOrCreateReviewShareId(db, {
                storageKey: file.file_storage_key,
                fileKind: 'submission_file',
                fileOriginalName: file.file_original_name,
            });
            const taskName = (file.task_name || 'Untitled Task').trim();
            const cell = row.getCell(key);
            cell.value = {
                text: `Task: ${taskName} - File ${index + 1}: ${file.file_original_name}`,
                hyperlink: buildPublicReviewUrl(publicBaseUrl, shareId),
            };
            cell.font = hyperlinkStyle;
            cell.alignment = { wrapText: true, vertical: 'top' };
        }

        row.height = 108;
    }

    sheet.getRow(1).font = { bold: true };

    const output = new PassThrough();
    void (async () => {
        await workbook.xlsx.write(output);
        output.end();
    })();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    return {
        fileName: `teams_selection_export_${timestamp}.xlsx`,
        stream: output,
    };
}

export async function exportTeamsContactSheet(
    db: DB,
    inputStatuses: string[],
): Promise<{ fileName: string; stream: PassThrough }> {
    const statuses = normalizeStatuses(inputStatuses);
    if (statuses.length === 0) {
        throw new BadRequestError('กรุณาเลือกสถานะทีมอย่างน้อย 1 สถานะ');
    }

    const teams = await repo.getTeamsForSheetExport(db, statuses);
    if (teams.length === 0) {
        throw new NotFoundError('ไม่พบข้อมูลทีมตามสถานะที่เลือก');
    }

    const teamIds = teams.map((team) => team.team_id);
    const [members, advisors, submissionFiles] = await Promise.all([
        repo.getTeamMembersForExport(db, teamIds),
        repo.getTeamAdvisorsForExport(db, teamIds),
        repo.getSubmissionFilesForExport(db, teamIds),
    ]);

    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();
    for (const row of members) {
        const bucket = membersByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        membersByTeam.set(row.team_id, bucket);
    }

    const advisorsByTeam = new Map<number, ExportTeamAdvisorRow[]>();
    for (const row of advisors) {
        const bucket = advisorsByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        advisorsByTeam.set(row.team_id, bucket);
    }

    // หา track ของผลงานลำดับที่ 1 และ 2 ต่อทีม (จากไฟล์ที่ส่งงาน work_1 / work_2)
    const worksByTeam = new Map<number, Map<ReviewWorkSlot, ExportSubmissionFileRow>>();
    for (const row of submissionFiles) {
        const slot = getReviewWorkSlot(row.task_name);
        if (!slot) continue;
        const bucket = worksByTeam.get(row.team_id) ?? new Map<ReviewWorkSlot, ExportSubmissionFileRow>();
        if (!bucket.has(slot)) bucket.set(slot, row); // เก็บไฟล์แรกของแต่ละ slot
        worksByTeam.set(row.team_id, bucket);
    }

    const getSortedMembers = (teamId: number) =>
        [...(membersByTeam.get(teamId) ?? [])].sort((a, b) => a.member_order - b.member_order);

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: สรุปทีม + track + ผู้ติดต่อสำหรับติดตาม
    const teamSheet = workbook.addWorksheet('teams');
    teamSheet.columns = [
        { header: 'team_id', key: 'team_id', width: 10 },
        { header: 'team_code', key: 'team_code', width: 14 },
        { header: 'team_name_th', key: 'team_name_th', width: 28 },
        { header: 'team_name_en', key: 'team_name_en', width: 28 },
        { header: 'status', key: 'status', width: 14 },
        { header: 'track_count', key: 'track_count', width: 12 },
        { header: 'track_1', key: 'track_1', width: 12 },
        { header: 'track_2', key: 'track_2', width: 12 },
        { header: 'member_count', key: 'member_count', width: 12 },
        { header: 'leader_name', key: 'leader_name', width: 24 },
        { header: 'leader_email', key: 'leader_email', width: 30 },
        { header: 'leader_phone', key: 'leader_phone', width: 18 },
        { header: 'institution', key: 'institution', width: 30 },
        { header: 'province', key: 'province', width: 18 },
        { header: 'advisor_name', key: 'advisor_name', width: 26 },
        { header: 'advisor_email', key: 'advisor_email', width: 30 },
        { header: 'advisor_phone', key: 'advisor_phone', width: 18 },
    ];

    for (const team of teams) {
        const teamMembers = getSortedMembers(team.team_id);
        const leader = teamMembers.find((member) => member.role === 'leader') || teamMembers[0] || null;
        const works = worksByTeam.get(team.team_id);
        const advisor = (advisorsByTeam.get(team.team_id) ?? [])[0] || null;
        teamSheet.addRow({
            team_id: team.team_id,
            team_code: team.team_code,
            team_name_th: team.team_name_th || '',
            team_name_en: team.team_name_en || '',
            status: team.status,
            track_count: (['work_1', 'work_2'] as ReviewWorkSlot[]).filter(
                (slot) => Boolean(works?.get(slot)?.submission_track),
            ).length,
            track_1: works?.get('work_1')?.submission_track || '',
            track_2: works?.get('work_2')?.submission_track || '',
            member_count: teamMembers.length,
            leader_name: leader ? pickMemberDisplayName(leader) : (team.leader_user_name || ''),
            leader_email: leader?.email || '',
            leader_phone: leader?.phone || '',
            institution: leader?.institution_name_th || '',
            province: leader?.home_province || '',
            advisor_name: advisor ? (buildAdvisorDisplayNameTh(advisor) || buildAdvisorDisplayNameEn(advisor)) : '',
            advisor_email: advisor?.email || '',
            advisor_phone: advisor?.phone || '',
        });
    }
    teamSheet.getRow(1).font = { bold: true };

    // Sheet 2: สมาชิก (1 แถว/คน มีอีเมล + รหัสผู้ใช้สำหรับระบุตัวบุคคล) สำหรับส่งเมล manual / ติดตาม
    const memberSheet = workbook.addWorksheet('members');
    memberSheet.columns = [
        { header: 'team_code', key: 'team_code', width: 14 },
        { header: 'team_name_th', key: 'team_name_th', width: 28 },
        { header: 'team_status', key: 'team_status', width: 14 },
        { header: 'role', key: 'role', width: 10 },
        { header: 'user_code', key: 'user_code', width: 14 },
        { header: 'name_th', key: 'name_th', width: 24 },
        { header: 'name_en', key: 'name_en', width: 24 },
        { header: 'gender', key: 'gender', width: 10 },
        { header: 'email', key: 'email', width: 30 },
        { header: 'phone', key: 'phone', width: 18 },
        { header: 'institution', key: 'institution', width: 30 },
        { header: 'education_level', key: 'education_level', width: 16 },
        { header: 'province', key: 'province', width: 18 },
    ];

    for (const team of teams) {
        for (const member of getSortedMembers(team.team_id)) {
            const nameTh = `${member.first_name_th || ''} ${member.last_name_th || ''}`.trim();
            const nameEn = `${member.first_name_en || ''} ${member.last_name_en || ''}`.trim();
            memberSheet.addRow({
                team_code: team.team_code,
                team_name_th: team.team_name_th || '',
                team_status: team.status,
                role: member.role,
                user_code: member.user_code || '',
                name_th: nameTh || pickMemberDisplayName(member),
                name_en: nameEn,
                gender: member.gender === 'male' ? 'ชาย' : member.gender === 'female' ? 'หญิง' : member.gender === 'other' ? 'อื่นๆ' : '',
                email: member.email || '',
                phone: member.phone || '',
                institution: member.institution_name_th || '',
                education_level: member.education_level || '',
                province: member.home_province || '',
            });
        }
    }
    memberSheet.getRow(1).font = { bold: true };

    const output = new PassThrough();
    void (async () => {
        await workbook.xlsx.write(output);
        output.end();
    })();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    return {
        fileName: `teams_contact_export_${timestamp}.xlsx`,
        stream: output,
    };
}

export async function exportCertificateCandidatesSheet(
    db: DB,
    publicBaseUrl: string,
): Promise<{ fileName: string; stream: PassThrough }> {
    const teams = await repo.getTeamsForSheetExport(db, ['submitted', 'passed', 'failed', 'confirmed', 'not_joined']);
    if (teams.length === 0) {
        throw new NotFoundError('ไม่พบข้อมูลทีมสำหรับสรุปผู้มีสิทธิ์ประกาศนียบัตร');
    }

    const teamIds = teams.map((team) => team.team_id);
    const members = await repo.getTeamMembersForExport(db, teamIds);

    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();
    for (const row of members) {
        const bucket = membersByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        membersByTeam.set(row.team_id, bucket);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('certificate_candidates');
    sheet.columns = [
        { header: 'team_id', key: 'team_id', width: 12 },
        { header: 'team_code', key: 'team_code', width: 14 },
        { header: 'team_name_th', key: 'team_name_th', width: 28 },
        { header: 'team_name_en', key: 'team_name_en', width: 28 },
        { header: 'team_status', key: 'team_status', width: 14 },
        { header: 'review_link', key: 'review_link', width: 42 },
        { header: 'member_names', key: 'member_names', width: 52 },
        { header: 'member_email', key: 'member_email', width: 52 },
    ];

    for (const team of teams) {
        const teamMembers = [...(membersByTeam.get(team.team_id) ?? [])].sort((a, b) => a.member_order - b.member_order);
        const reviewUrl = buildAdminTeamSubmissionsPageUrl(publicBaseUrl, team.team_id);
        const row = sheet.addRow({
            team_id: team.team_id,
            team_code: team.team_code,
            team_name_th: team.team_name_th || '',
            team_name_en: team.team_name_en || '',
            team_status: team.status,
            member_names: teamMembers.map(pickMemberDisplayName).filter(Boolean).join(', '),
            member_email: teamMembers.map((member) => member.email || '').filter(Boolean).join(', '),
        });

        const reviewCell = row.getCell('review_link');
        reviewCell.value = {
            text: reviewUrl,
            hyperlink: reviewUrl,
        };
        reviewCell.font = { color: { argb: 'FF0563C1' }, underline: true };
        row.getCell('member_names').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('member_email').alignment = { wrapText: true, vertical: 'top' };
        row.height = 54;
    }

    sheet.getRow(1).font = { bold: true };

    const output = new PassThrough();
    void (async () => {
        await workbook.xlsx.write(output);
        output.end();
    })();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    return {
        fileName: `certificate_candidates_${timestamp}.xlsx`,
        stream: output,
    };
}

export async function exportTeamsReviewSheet(
    db: DB,
    inputStatuses: string[],
    publicBaseUrl: string,
): Promise<{ fileName: string; stream: PassThrough }> {
    const statuses = normalizeStatuses(inputStatuses);
    if (statuses.length === 0) {
        throw new BadRequestError('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธชเธ–เธฒเธเธฐเธ—เธตเธกเธญเธขเนเธฒเธเธเนเธญเธข 1 เธชเธ–เธฒเธเธฐ');
    }

    const teams = await repo.getTeamsForSheetExport(db, statuses);
    if (teams.length === 0) {
        throw new NotFoundError('เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธ—เธตเธกเธ•เธฒเธกเธชเธ–เธฒเธเธฐเธ—เธตเนเน€เธฅเธทเธญเธ');
    }

    const teamIds = teams.map((team) => team.team_id);
    const [advisors, members, submissionFiles, submissionLinks] = await Promise.all([
        repo.getTeamAdvisorsForExport(db, teamIds),
        repo.getTeamMembersForExport(db, teamIds),
        repo.getSubmissionFilesForExport(db, teamIds),
        repo.getSubmissionLinksForExport(db, teamIds),
    ]);

    const advisorsByTeam = new Map<number, ExportTeamAdvisorRow[]>();
    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();
    const submissionFilesByTeam = new Map<number, ExportSubmissionFileRow[]>();
    const submissionLinksByTeam = new Map<number, ExportSubmissionLinkRow[]>();

    for (const row of advisors) {
        const bucket = advisorsByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        advisorsByTeam.set(row.team_id, bucket);
    }
    for (const row of members) {
        const bucket = membersByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        membersByTeam.set(row.team_id, bucket);
    }
    for (const row of submissionFiles) {
        const bucket = submissionFilesByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        submissionFilesByTeam.set(row.team_id, bucket);
    }
    for (const row of submissionLinks) {
        const bucket = submissionLinksByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        submissionLinksByTeam.set(row.team_id, bucket);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('teams_review_links');
    sheet.columns = [
        { header: 'team_id', key: 'team_id', width: 12 },
        { header: 'team_code', key: 'team_code', width: 14 },
        { header: 'team_name_th', key: 'team_name_th', width: 28 },
        { header: 'team_name_en', key: 'team_name_en', width: 28 },
        { header: 'team_status', key: 'team_status', width: 14 },
        { header: 'review_link', key: 'review_link', width: 42 },
        { header: 'leader_user_name', key: 'leader_user_name', width: 24 },
        { header: 'member_count', key: 'member_count', width: 12 },
        { header: 'member_names', key: 'member_names', width: 42 },
        { header: 'advisor_names', key: 'advisor_names', width: 34 },
        { header: 'submission_link_count', key: 'submission_link_count', width: 20 },
        { header: 'submission_file_count', key: 'submission_file_count', width: 20 },
        { header: 'created_at', key: 'created_at', width: 20 },
        { header: 'updated_at', key: 'updated_at', width: 20 },
    ];

    const hyperlinkStyle: Partial<ExcelJS.Font> = {
        color: { argb: 'FF0563C1' },
        underline: true,
    };

    for (const team of teams) {
        const teamMembers = [...(membersByTeam.get(team.team_id) ?? [])].sort((a, b) => a.member_order - b.member_order);
        const teamAdvisors = advisorsByTeam.get(team.team_id) ?? [];
        const teamSubmissionFiles = submissionFilesByTeam.get(team.team_id) ?? [];
        const teamSubmissionLinks = submissionLinksByTeam.get(team.team_id) ?? [];
        const leader = teamMembers.find((member) => member.role === 'leader') || teamMembers[0] || null;
        const leaderDisplayName = leader ? pickMemberDisplayName(leader) : (team.leader_user_name || '');
        const teamShareId = await getOrCreateTeamReviewShareId(db, team.team_id);
        const reviewUrl = buildPublicTeamReviewPageUrl(publicBaseUrl, teamShareId);

        const row = sheet.addRow({
            team_id: team.team_id,
            team_code: team.team_code,
            team_name_th: team.team_name_th || '',
            team_name_en: team.team_name_en || '',
            team_status: team.status,
            leader_user_name: leaderDisplayName,
            member_count: teamMembers.length,
            member_names: teamMembers.map(pickMemberDisplayName).filter(Boolean).join(', '),
            advisor_names: teamAdvisors.map((advisor) => buildAdvisorDisplayNameTh(advisor) || buildAdvisorDisplayNameEn(advisor)).filter(Boolean).join(', '),
            submission_link_count: teamSubmissionLinks.length,
            submission_file_count: teamSubmissionFiles.length,
            created_at: formatDateTime(team.created_at),
            updated_at: formatDateTime(team.updated_at),
        });

        const reviewCell = row.getCell('review_link');
        reviewCell.value = {
            text: 'Open Team Review',
            hyperlink: reviewUrl,
        };
        reviewCell.font = hyperlinkStyle;
        row.getCell('member_names').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('advisor_names').alignment = { wrapText: true, vertical: 'top' };
        row.height = 54;
    }

    sheet.getRow(1).font = { bold: true };

    const output = new PassThrough();
    void (async () => {
        await workbook.xlsx.write(output);
        output.end();
    })();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    return {
        fileName: `teams_review_links_${timestamp}.xlsx`,
        stream: output,
    };
}

export async function exportTeamsReviewSheetByTrack(
    db: DB,
    inputStatuses: string[],
    track: SubmissionReviewTrack,
    publicBaseUrl: string,
): Promise<{ fileName: string; stream: PassThrough }> {
    const statuses = normalizeStatuses(inputStatuses);
    if (statuses.length === 0) {
        throw new BadRequestError('กรุณาเลือกสถานะทีมอย่างน้อย 1 สถานะ');
    }

    const teams = await repo.getTeamsForSheetExport(db, statuses);
    if (teams.length === 0) {
        throw new NotFoundError('ไม่พบทีมสำหรับ export review links');
    }

    const teamIds = teams.map((team) => team.team_id);
    const [advisors, members, submissionFiles, submissionLinks] = await Promise.all([
        repo.getTeamAdvisorsForExport(db, teamIds),
        repo.getTeamMembersForExport(db, teamIds),
        repo.getSubmissionFilesForExport(db, teamIds),
        repo.getSubmissionLinksForExport(db, teamIds),
    ]);

    const advisorsByTeam = new Map<number, ExportTeamAdvisorRow[]>();
    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();
    const trackReviewWorksByTeam = new Map<number, ExportSubmissionFileRow[]>();
    const presentationVideoByTeam = new Map<number, ExportSubmissionLinkRow>();

    for (const row of advisors) {
        const bucket = advisorsByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        advisorsByTeam.set(row.team_id, bucket);
    }
    for (const row of members) {
        const bucket = membersByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        membersByTeam.set(row.team_id, bucket);
    }
    for (const row of submissionFiles) {
        if (!getReviewWorkSlot(row.task_name)) continue;
        if (row.submission_track === track) {
            const trackBucket = trackReviewWorksByTeam.get(row.team_id) ?? [];
            trackBucket.push(row);
            trackReviewWorksByTeam.set(row.team_id, trackBucket);
        }
    }
    for (const row of submissionLinks) {
        if (!isPresentationVideoTask(row.task_name)) continue;
        if (presentationVideoByTeam.has(row.team_id)) continue;
        presentationVideoByTeam.set(row.team_id, row);
    }

    const teamsWithTrack = teams.filter((team) => (trackReviewWorksByTeam.get(team.team_id) ?? []).length > 0);
    if (teamsWithTrack.length === 0) {
        throw new NotFoundError(`ไม่พบทีมที่ส่งผลงานประเภท ${track}`);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${track}_review_links`);
    sheet.columns = [
        { header: 'team_id', key: 'team_id', width: 12 },
        { header: 'team_code', key: 'team_code', width: 14 },
        { header: 'team_name_th', key: 'team_name_th', width: 28 },
        { header: 'team_name_en', key: 'team_name_en', width: 28 },
        { header: 'team_status', key: 'team_status', width: 14 },
        { header: 'export_track', key: 'export_track', width: 14 },
        { header: 'review_link', key: 'review_link', width: 42 },
        { header: 'ส่งวิดีโอนำเสนอผลงาน', key: 'presentation_video_link', width: 34 },
        { header: 'total_submitted_works', key: 'total_submitted_works', width: 22 },
        { header: 'work_1_track', key: 'work_1_track', width: 16 },
        { header: 'work_1_file_name', key: 'work_1_file_name', width: 32 },
        { header: 'work_1_uploaded_at', key: 'work_1_uploaded_at', width: 20 },
        { header: 'work_2_track', key: 'work_2_track', width: 16 },
        { header: 'work_2_file_name', key: 'work_2_file_name', width: 32 },
        { header: 'work_2_uploaded_at', key: 'work_2_uploaded_at', width: 20 },
        { header: 'leader_user_name', key: 'leader_user_name', width: 24 },
        { header: 'member_count', key: 'member_count', width: 12 },
        { header: 'member_names', key: 'member_names', width: 42 },
        { header: 'CV', key: 'cv', width: 60 },
        { header: 'advisor_names', key: 'advisor_names', width: 34 },
        { header: 'created_at', key: 'created_at', width: 20 },
        { header: 'updated_at', key: 'updated_at', width: 20 },
    ];

    const hyperlinkStyle: Partial<ExcelJS.Font> = {
        color: { argb: 'FF0563C1' },
        underline: true,
    };

    for (const team of teamsWithTrack) {
        const teamMembers = [...(membersByTeam.get(team.team_id) ?? [])].sort((a, b) => a.member_order - b.member_order);
        const teamAdvisors = advisorsByTeam.get(team.team_id) ?? [];
        const teamWorks = trackReviewWorksByTeam.get(team.team_id) ?? [];
        const worksBySlot = new Map<ReviewWorkSlot, ExportSubmissionFileRow>();
        for (const work of teamWorks) {
            const slot = getReviewWorkSlot(work.task_name);
            if (!slot || worksBySlot.has(slot)) continue;
            worksBySlot.set(slot, work);
        }

        const leader = teamMembers.find((member) => member.role === 'leader') || teamMembers[0] || null;
        const leaderDisplayName = leader ? pickMemberDisplayName(leader) : (team.leader_user_name || '');
        const teamShareId = await getOrCreateTeamReviewShareId(db, team.team_id, track);
        const reviewUrl = buildPublicTeamReviewPageUrl(publicBaseUrl, teamShareId);
        const presentationVideo = presentationVideoByTeam.get(team.team_id) || null;
        const memberCvs = teamMembers
            .map((member) => String(member.cv || '').trim())
            .filter((cv) => cv.length > 0)
            .join('\n\n---\n\n');
        const work1 = worksBySlot.get('work_1');
        const work2 = worksBySlot.get('work_2');

        const row = sheet.addRow({
            team_id: team.team_id,
            team_code: team.team_code,
            team_name_th: team.team_name_th || '',
            team_name_en: team.team_name_en || '',
            team_status: team.status,
            export_track: track,
            total_submitted_works: worksBySlot.size,
            work_1_track: work1?.submission_track || '',
            work_1_file_name: work1?.file_original_name || '',
            work_1_uploaded_at: work1 ? formatDateTime(work1.uploaded_at) : '',
            work_2_track: work2?.submission_track || '',
            work_2_file_name: work2?.file_original_name || '',
            work_2_uploaded_at: work2 ? formatDateTime(work2.uploaded_at) : '',
            leader_user_name: leaderDisplayName,
            member_count: teamMembers.length,
            member_names: teamMembers.map(pickMemberDisplayName).filter(Boolean).join(', '),
            cv: memberCvs,
            advisor_names: teamAdvisors.map((advisor) => buildAdvisorDisplayNameTh(advisor) || buildAdvisorDisplayNameEn(advisor)).filter(Boolean).join(', '),
            created_at: formatDateTime(team.created_at),
            updated_at: formatDateTime(team.updated_at),
        });

        const reviewCell = row.getCell('review_link');
        reviewCell.value = {
            text: 'Open Team Review',
            hyperlink: reviewUrl,
        };
        reviewCell.font = hyperlinkStyle;
        const presentationVideoCell = row.getCell('presentation_video_link');
        if (presentationVideo?.link_url) {
            presentationVideoCell.value = {
                text: PRESENTATION_VIDEO_TASK_NAME,
                hyperlink: presentationVideo.link_url,
            };
            presentationVideoCell.font = hyperlinkStyle;
        } else {
            presentationVideoCell.value = '';
        }
        row.getCell('member_names').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('cv').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('advisor_names').alignment = { wrapText: true, vertical: 'top' };
        row.height = 54;
    }

    sheet.getRow(1).font = { bold: true };

    const output = new PassThrough();
    void (async () => {
        await workbook.xlsx.write(output);
        output.end();
    })();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    return {
        fileName: `teams_review_links_${track.toLowerCase()}_${timestamp}.xlsx`,
        stream: output,
    };
}

export async function exportTeamsIdentityReviewSheetByTrack(
    db: DB,
    inputStatuses: string[],
    track: SubmissionReviewTrack,
    publicBaseUrl: string,
): Promise<{ fileName: string; stream: PassThrough }> {
    const statuses = normalizeStatuses(inputStatuses);
    if (statuses.length === 0) {
        throw new BadRequestError('กรุณาเลือกสถานะทีมอย่างน้อย 1 สถานะ');
    }

    const teams = await repo.getTeamsForSheetExport(db, statuses);
    if (teams.length === 0) {
        throw new NotFoundError('ไม่พบทีมสำหรับ export identity review links');
    }

    const teamIds = teams.map((team) => team.team_id);
    const [members, memberDocuments, submissionFiles] = await Promise.all([
        repo.getTeamMembersForExport(db, teamIds),
        repo.getMemberDocumentsForExport(db, teamIds),
        repo.getSubmissionFilesForExport(db, teamIds),
    ]);

    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();
    const trackReviewWorksByTeam = new Map<number, ExportSubmissionFileRow[]>();
    const documentUsersByTeam = new Map<number, Set<number>>();

    for (const row of members) {
        const bucket = membersByTeam.get(row.team_id) ?? [];
        bucket.push(row);
        membersByTeam.set(row.team_id, bucket);
    }
    for (const row of submissionFiles) {
        if (!getReviewWorkSlot(row.task_name)) continue;
        if (row.submission_track === track) {
            const trackBucket = trackReviewWorksByTeam.get(row.team_id) ?? [];
            trackBucket.push(row);
            trackReviewWorksByTeam.set(row.team_id, trackBucket);
        }
    }
    for (const row of memberDocuments) {
        const bucket = documentUsersByTeam.get(row.team_id) ?? new Set<number>();
        bucket.add(row.user_id);
        documentUsersByTeam.set(row.team_id, bucket);
    }

    const teamsWithTrack = teams.filter((team) => (trackReviewWorksByTeam.get(team.team_id) ?? []).length > 0);
    if (teamsWithTrack.length === 0) {
        throw new NotFoundError(`ไม่พบทีมที่ส่งผลงานประเภท ${track}`);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${track}_identity_review`);
    sheet.columns = [
        { header: 'team_id', key: 'team_id', width: 12 },
        { header: 'team_code', key: 'team_code', width: 14 },
        { header: 'team_name_th', key: 'team_name_th', width: 28 },
        { header: 'team_name_en', key: 'team_name_en', width: 28 },
        { header: 'team_status', key: 'team_status', width: 14 },
        { header: 'export_track', key: 'export_track', width: 14 },
        { header: 'identity_review_link', key: 'identity_review_link', width: 42 },
        { header: 'leader_user_name', key: 'leader_user_name', width: 24 },
        { header: 'leader_phone', key: 'leader_phone', width: 18 },
        { header: 'member_count', key: 'member_count', width: 12 },
        { header: 'ม.ต้น', key: 'edu_secondary', width: 8 },
        { header: 'ม.ปลาย', key: 'edu_high_school', width: 8 },
        { header: 'ป.ตรี', key: 'edu_bachelor', width: 8 },
        { header: 'ป.โท', key: 'edu_master', width: 8 },
        { header: 'ป.เอก', key: 'edu_doctorate', width: 8 },
        { header: 'members_with_documents', key: 'members_with_documents', width: 22 },
        { header: 'member_names', key: 'member_names', width: 42 },
        { header: 'member_institutions', key: 'member_institutions', width: 42 },
        { header: 'member_provinces', key: 'member_provinces', width: 28 },
        { header: 'created_at', key: 'created_at', width: 20 },
        { header: 'updated_at', key: 'updated_at', width: 20 },
    ];

    const hyperlinkStyle: Partial<ExcelJS.Font> = {
        color: { argb: 'FF0563C1' },
        underline: true,
    };

    for (const team of teamsWithTrack) {
        const teamMembers = [...(membersByTeam.get(team.team_id) ?? [])].sort((a, b) => a.member_order - b.member_order);
        const leader = teamMembers.find((member) => member.role === 'leader') || teamMembers[0] || null;
        const leaderDisplayName = leader ? pickMemberDisplayName(leader) : (team.leader_user_name || '');
        const teamShareId = await getOrCreateTeamReviewShareId(db, team.team_id, track);
        const reviewUrl = buildPublicTeamIdentityReviewPageUrl(publicBaseUrl, teamShareId);
        const documentUsers = documentUsersByTeam.get(team.team_id) ?? new Set<number>();

        const educationCounts: Record<string, number> = {
            secondary: 0,
            high_school: 0,
            bachelor: 0,
            master: 0,
            doctorate: 0,
        };
        for (const member of teamMembers) {
            const level = String(member.education_level || '');
            if (level in educationCounts) educationCounts[level] = (educationCounts[level] ?? 0) + 1;
        }

        const row = sheet.addRow({
            team_id: team.team_id,
            team_code: team.team_code,
            team_name_th: team.team_name_th || '',
            team_name_en: team.team_name_en || '',
            team_status: team.status,
            export_track: track,
            leader_user_name: leaderDisplayName,
            leader_phone: leader?.phone || '',
            member_count: teamMembers.length,
            edu_secondary: educationCounts.secondary,
            edu_high_school: educationCounts.high_school,
            edu_bachelor: educationCounts.bachelor,
            edu_master: educationCounts.master,
            edu_doctorate: educationCounts.doctorate,
            members_with_documents: documentUsers.size,
            member_names: teamMembers.map(pickMemberDisplayName).filter(Boolean).join(', '),
            member_institutions: teamMembers
                .map((member) => member.institution_name_th || member.institution_name_en || '')
                .filter(Boolean)
                .join(', '),
            member_provinces: teamMembers
                .map((member) => member.home_province || '')
                .filter(Boolean)
                .join(', '),
            created_at: formatDateTime(team.created_at),
            updated_at: formatDateTime(team.updated_at),
        });

        const reviewCell = row.getCell('identity_review_link');
        reviewCell.value = {
            text: 'Open Identity Review',
            hyperlink: reviewUrl,
        };
        reviewCell.font = hyperlinkStyle;
        row.getCell('member_names').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('member_institutions').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('member_provinces').alignment = { wrapText: true, vertical: 'top' };
        row.height = 54;
    }

    sheet.getRow(1).font = { bold: true };

    const output = new PassThrough();
    void (async () => {
        await workbook.xlsx.write(output);
        output.end();
    })();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    return {
        fileName: `teams_identity_review_${track.toLowerCase()}_${timestamp}.xlsx`,
        stream: output,
    };
}

export async function getSelectionTeams(
    db: DB,
    status?: 'forming' | 'submitted' | 'passed' | 'failed' | 'confirmed' | 'not_joined',
): Promise<SelectionTeamRow[]> {
    return repo.listSelectionTeams(db, status);
}

export async function setSelectionResult(
    db: DB,
    data: {
        teamId: number;
        adminUserId: number;
        status: 'passed' | 'failed';
    },
): Promise<SelectionTeamRow> {
    const team = await repo.getSelectionTeamById(db, data.teamId);
    if (!team) throw new NotFoundError('ไม่พบทีม');

    const confirmDeadlineAt = data.status === 'passed'
        ? (await getGlobalSelectionConfirmWindow(db)).closeAt
        : null;
    if (data.status === 'passed' && !confirmDeadlineAt) {
        throw new BadRequestError('ยังไม่ได้ตั้งค่า Global confirm close time จากหน้า admin');
    }

    await repo.updateSelectionResult(db, {
        teamId: data.teamId,
        status: data.status,
        confirmationDeadlineAt: confirmDeadlineAt,
    });

    await createTeamAuditLog(db, {
        teamId: data.teamId,
        actorUserId: data.adminUserId,
        actionCode: data.status === 'passed' ? 'TEAM_SELECTION_PASSED' : 'TEAM_SELECTION_FAILED',
        actionDetail: {
            previous_status: team.status,
            next_status: data.status,
            confirmation_deadline_at: confirmDeadlineAt,
        },
    });

    const updated = await repo.getSelectionTeamById(db, data.teamId);
    if (!updated) throw new NotFoundError('ไม่พบทีมหลังอัปเดตผลคัดเลือก');
    return updated;
}

/**
 * ตั้งผลคัดเลือกหลายทีมพร้อมกัน (bulk) — ใช้ตอนมาร์คทีมที่เหลือเป็น "ไม่ผ่าน" จำนวนมาก
 * ทำทีละทีมโดยใช้ logic เดียวกับ setSelectionResult (audit log + deadline + ล้าง not_joined)
 * คืนสรุปจำนวนสำเร็จ/ที่ข้าม เพื่อรองรับกรณีบางทีมไม่พบ
 */
export async function setSelectionResultBulk(
    db: DB,
    data: {
        teamIds: number[];
        adminUserId: number;
        status: 'passed' | 'failed';
    },
): Promise<{ requested: number; updated: number; skipped: Array<{ teamId: number; reason: string }> }> {
    const uniqueIds = Array.from(new Set(data.teamIds));

    // ถ้าตั้งเป็น "ผ่าน" ต้องมี global confirm window ก่อน — เช็คครั้งเดียว fail fast
    if (data.status === 'passed') {
        const window = await getGlobalSelectionConfirmWindow(db);
        if (!window.closeAt) {
            throw new BadRequestError('ยังไม่ได้ตั้งค่า Global confirm close time จากหน้า admin');
        }
    }

    const skipped: Array<{ teamId: number; reason: string }> = [];
    let updated = 0;

    for (const teamId of uniqueIds) {
        try {
            await setSelectionResult(db, { teamId, adminUserId: data.adminUserId, status: data.status });
            updated += 1;
        } catch (error) {
            skipped.push({ teamId, reason: error instanceof Error ? error.message : 'unknown error' });
        }
    }

    return { requested: uniqueIds.length, updated, skipped };
}

/**
 * ทีมสละสิทธิ์หลังยืนยันแล้ว (admin): เปลี่ยนสถานะเป็น not_joined, ล้างการยืนยัน และถอน privileges ที่มอบตอน confirm
 * ใช้เปิดที่ว่างให้ทีมสำรอง
 */
export async function forfeitTeam(
    db: DB,
    data: {
        teamId: number;
        adminUserId: number;
    },
): Promise<SelectionTeamRow> {
    const team = await repo.getSelectionTeamById(db, data.teamId);
    if (!team) throw new NotFoundError('ไม่พบทีม');

    await repo.setTeamNotJoined(db, data.teamId);
    const { revoked } = await privilegesService.revokeTeamPrivileges(db, data.teamId);

    await createTeamAuditLog(db, {
        teamId: data.teamId,
        actorUserId: data.adminUserId,
        actionCode: 'TEAM_SELECTION_FORFEITED',
        actionDetail: {
            previous_status: team.status,
            next_status: 'not_joined',
            was_confirmed_at: team.confirmed_at,
            revoked_privileges: revoked,
        },
    });

    const updated = await repo.getSelectionTeamById(db, data.teamId);
    if (!updated) throw new NotFoundError('ไม่พบทีมหลังบันทึกการสละสิทธิ์');
    return updated;
}

function normalizeDateTimeToDb(rawInput: string): string {
    return normalizeWallClockToDb(rawInput);
}

export async function getGlobalSelectionConfirmWindow(db: DB): Promise<{ openAt: string | null; closeAt: string | null }> {
    const [openAt, closeAt] = await Promise.all([
        repo.getSysConfigValue(db, GLOBAL_SELECTION_CONFIRM_OPEN_AT_KEY),
        repo.getSysConfigValue(db, GLOBAL_SELECTION_CONFIRM_CLOSE_AT_KEY),
    ]);
    return {
        openAt,
        closeAt,
    };
}

export async function setGlobalSelectionConfirmWindow(
    db: DB,
    rawOpenAt: string,
    rawCloseAt: string,
): Promise<{ openAt: string; closeAt: string }> {
    const openAt = normalizeDateTimeToDb(rawOpenAt);
    const closeAt = normalizeDateTimeToDb(rawCloseAt);
    if (new Date(closeAt).getTime() < new Date(openAt).getTime()) {
        throw new BadRequestError('วันเวลาเปิดต้องไม่มากกว่าวันเวลาปิด');
    }

    await Promise.all([
        repo.upsertSysConfigValue(db, GLOBAL_SELECTION_CONFIRM_OPEN_AT_KEY, openAt),
        repo.upsertSysConfigValue(db, GLOBAL_SELECTION_CONFIRM_CLOSE_AT_KEY, closeAt),
    ]);
    await repo.applyGlobalSelectionDeadlineToPassedTeams(db, closeAt);
    return {
        openAt,
        closeAt,
    };
}

export async function expireSelectionConfirmTimedOutTeams(db: DB): Promise<{ updatedCount: number }> {
    const updatedCount = await repo.expirePassedTeamsToNotJoined(db);
    return { updatedCount };
}

function normalizeAllowedExtensions(rawValue: string | null | undefined): string | null {
    if (rawValue == null) return null;
    const normalized = rawValue
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
        .map((entry) => (entry.startsWith('.') ? entry : `.${entry}`));
    if (normalized.length === 0) return null;
    return Array.from(new Set(normalized)).join(',');
}

function normalizeOptionalDeadline(rawValue: string | null | undefined): string | null {
    if (!rawValue) return null;
    const value = String(rawValue).trim();
    if (!value) return null;
    return normalizeWallClockToDb(value, 'deadline');
}

function toSubmissionTaskResponse(row: AdminSubmissionTaskRow) {
    return {
        submissionTaskId: row.submission_task_id,
        taskName: row.task_name,
        description: row.description,
        taskType: row.task_type,
        stage: row.stage,
        isRequired: row.is_required === 1,
        allowedExtensions: row.allowed_extensions,
        sortOrder: row.sort_order,
        deadlineAt: row.deadline_at,
        isEnabled: row.is_enabled === 1,
        isDefault: row.is_default === 1,
        createdByUserId: row.created_by_user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        assignedTeamCount: Number(row.assigned_team_count || 0),
    };
}

export async function listSubmissionTasksAdmin(db: DB) {
    const rows = await repo.listSubmissionTasksAdmin(db);
    return rows.map(toSubmissionTaskResponse);
}

export async function getSubmissionTaskAssignedTeamsAdmin(db: DB, submissionTaskId: number) {
    const task = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!task) {
        throw new NotFoundError('ไม่พบงานส่งผลงาน');
    }

    const rows = await repo.listAssignedTeamsBySubmissionTaskAdmin(db, submissionTaskId);
    return rows.map((row) => ({
        teamId: row.team_id,
        teamCode: row.team_code,
        teamName: row.team_name_th || '-',
        status: row.status,
        isSubmissionOpen: row.is_submission_open === 1,
    }));
}

async function resolveTeamIdsForSubmissionTaskAssignment(
    db: DB,
    input: {
        teamIds?: number[] | undefined;
        teamStatuses?: Array<'forming' | 'submitted' | 'passed' | 'failed' | 'confirmed' | 'not_joined' | 'disbanded'> | undefined;
    },
): Promise<number[]> {
    const teamIdsFromStatus = await repo.listTeamIdsByStatusesAdmin(db, input.teamStatuses ?? []);
    const explicitTeamIds = (input.teamIds ?? []).filter((teamId) => Number.isFinite(teamId));
    return Array.from(new Set([...explicitTeamIds, ...teamIdsFromStatus]));
}

export async function createSubmissionTaskAdmin(
    db: DB,
    input: {
        taskName: string;
        description?: string | null | undefined;
        taskType: 'link' | 'file';
        stage?: 'pre_selection' | 'training' | 'onsite' | undefined;
        isRequired?: boolean | undefined;
        isDefault?: boolean | undefined;
        allowedExtensions?: string | null | undefined;
        sortOrder?: number | undefined;
        deadlineAt?: string | null | undefined;
        isSubmissionOpen?: boolean | undefined;
        teamIds?: number[] | undefined;
        teamStatuses?: Array<'forming' | 'submitted' | 'passed' | 'failed' | 'confirmed' | 'not_joined' | 'disbanded'> | undefined;
    },
    adminUserId: number,
) {
    const mergedTeamIds = await resolveTeamIdsForSubmissionTaskAssignment(db, input);

    if (!input.isDefault && mergedTeamIds.length === 0) {
        throw new BadRequestError('ไม่พบทีมที่ตรงกับเงื่อนไขสำหรับ assign งาน');
    }

    const allowedExtensions = input.taskType === 'file'
        ? normalizeAllowedExtensions(input.allowedExtensions)
        : null;
    const normalizedDeadline = normalizeOptionalDeadline(input.deadlineAt);

    const submissionTaskId = await repo.createSubmissionTaskAdmin(db, {
        taskName: input.taskName.trim(),
        description: input.description?.trim() || null,
        taskType: input.taskType,
        stage: input.stage ?? 'pre_selection',
        isRequired: Boolean(input.isRequired),
        isDefault: Boolean(input.isDefault),
        allowedExtensions,
        sortOrder: Number.isFinite(Number(input.sortOrder)) ? Math.trunc(Number(input.sortOrder)) : 0,
        deadlineAt: normalizedDeadline,
        createdByUserId: adminUserId,
    });

    const existingAssignedTeamIds = await repo.listExistingAssignedTeamIdsAdmin(db, submissionTaskId);
    const existingAssignedSet = new Set(existingAssignedTeamIds);
    const teamIdsToAssign = mergedTeamIds.filter((teamId) => !existingAssignedSet.has(teamId));

    const assignedSource = (input.teamStatuses?.length ?? 0) > 0 ? 'admin_status' : 'admin_team';
    const assignedCount = teamIdsToAssign.length > 0
        ? await repo.bulkAssignSubmissionTaskToTeamsAdmin(db, {
            submissionTaskId,
            assignedByUserId: adminUserId,
            assignedSource,
            isSubmissionOpen: input.isSubmissionOpen ?? true,
            teamIds: teamIdsToAssign,
        })
        : 0;

    const created = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!created) {
        throw new NotFoundError('ไม่พบงานส่งผลงานที่เพิ่งสร้าง');
    }

    return {
        task: toSubmissionTaskResponse(created),
        assignedCount,
        assignedTeamIds: teamIdsToAssign,
    };
}

export async function updateSubmissionTaskAdmin(
    db: DB,
    submissionTaskId: number,
    input: {
        taskName?: string | undefined;
        description?: string | null | undefined;
        taskType?: 'link' | 'file' | undefined;
        stage?: 'pre_selection' | 'training' | 'onsite' | undefined;
        isRequired?: boolean | undefined;
        allowedExtensions?: string | null | undefined;
        sortOrder?: number | undefined;
        deadlineAt?: string | null | undefined;
        isEnabled?: boolean | undefined;
    },
) {
    const existing = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!existing) {
        throw new NotFoundError('ไม่พบงานส่งผลงาน');
    }

    const patch: {
        taskName?: string;
        description?: string | null;
        taskType?: 'link' | 'file';
        stage?: 'pre_selection' | 'training' | 'onsite';
        isRequired?: boolean;
        allowedExtensions?: string | null;
        sortOrder?: number;
        deadlineAt?: string | null;
        isEnabled?: boolean;
    } = {};

    if (input.taskName !== undefined) {
        const taskName = input.taskName.trim();
        if (!taskName) {
            throw new BadRequestError('กรุณาระบุชื่องาน');
        }
        patch.taskName = taskName;
    }
    if (input.description !== undefined) {
        patch.description = input.description?.trim() || null;
    }
    if (input.taskType !== undefined) {
        patch.taskType = input.taskType;
    }
    if (input.stage !== undefined) {
        patch.stage = input.stage;
    }
    if (input.isRequired !== undefined) {
        patch.isRequired = Boolean(input.isRequired);
    }
    if (input.sortOrder !== undefined) {
        patch.sortOrder = Math.max(0, Math.trunc(Number(input.sortOrder) || 0));
    }
    if (input.deadlineAt !== undefined) {
        patch.deadlineAt = normalizeOptionalDeadline(input.deadlineAt);
    }
    if (input.isEnabled !== undefined) {
        patch.isEnabled = Boolean(input.isEnabled);
    }

    const nextTaskType = input.taskType ?? existing.task_type;
    if (nextTaskType === 'file') {
        if (input.allowedExtensions !== undefined) {
            patch.allowedExtensions = normalizeAllowedExtensions(input.allowedExtensions);
        }
    } else {
        patch.allowedExtensions = null;
    }

    await repo.updateSubmissionTaskAdmin(db, submissionTaskId, patch);

    const updated = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!updated) {
        throw new NotFoundError('ไม่พบงานส่งผลงานหลังอัปเดต');
    }

    return toSubmissionTaskResponse(updated);
}

export async function assignSubmissionTaskTeamsAdmin(
    db: DB,
    submissionTaskId: number,
    input: {
        isSubmissionOpen?: boolean | undefined;
        teamIds?: number[] | undefined;
        teamStatuses?: Array<'forming' | 'submitted' | 'passed' | 'failed' | 'confirmed' | 'not_joined' | 'disbanded'> | undefined;
    },
    adminUserId: number,
) {
    const existingTask = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!existingTask) {
        throw new NotFoundError('ไม่พบงานส่งผลงาน');
    }

    const mergedTeamIds = await resolveTeamIdsForSubmissionTaskAssignment(db, input);
    if (mergedTeamIds.length === 0) {
        throw new BadRequestError('ไม่พบทีมที่ตรงกับเงื่อนไขสำหรับ assign งาน');
    }

    const existingAssignedTeamIds = await repo.listExistingAssignedTeamIdsAdmin(db, submissionTaskId);
    const existingAssignedSet = new Set(existingAssignedTeamIds);
    const teamIdsToAssign = mergedTeamIds.filter((teamId) => !existingAssignedSet.has(teamId));

    const assignedSource = (input.teamStatuses?.length ?? 0) > 0 ? 'admin_status' : 'admin_team';
    const assignedCount = await repo.bulkAssignSubmissionTaskToTeamsAdmin(db, {
        submissionTaskId,
        assignedByUserId: adminUserId,
        assignedSource,
        isSubmissionOpen: input.isSubmissionOpen ?? true,
        teamIds: teamIdsToAssign,
    });

    const updated = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!updated) {
        throw new NotFoundError('ไม่พบงานส่งผลงานหลัง assign ทีม');
    }

    return {
        task: toSubmissionTaskResponse(updated),
        assignedCount,
        assignedTeamIds: teamIdsToAssign,
    };
}

export async function unassignSubmissionTaskTeamAdmin(
    db: DB,
    submissionTaskId: number,
    teamId: number,
) {
    const existingTask = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!existingTask) {
        throw new NotFoundError('ไม่พบงานส่งผลงาน');
    }

    const removed = await repo.unassignSubmissionTaskTeamAdmin(db, submissionTaskId, teamId);
    if (removed === 0) {
        throw new NotFoundError('ไม่พบการมอบหมายงานของทีมนี้');
    }

    const updated = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!updated) {
        throw new NotFoundError('ไม่พบงานส่งผลงานหลังถอดทีม');
    }

    return {
        task: toSubmissionTaskResponse(updated),
        teamId,
    };
}

export async function reorderSubmissionTasksAdmin(
    db: DB,
    updates: Array<{ submissionTaskId: number; sortOrder: number }>,
): Promise<void> {
    await repo.reorderSubmissionTasksAdmin(db, updates);
}

export async function deleteSubmissionTaskAdmin(db: DB, submissionTaskId: number): Promise<void> {
    const existing = await repo.getSubmissionTaskByIdAdmin(db, submissionTaskId);
    if (!existing) {
        throw new NotFoundError('ไม่พบงานส่งผลงาน');
    }

    if (existing.is_default === 1) {
        throw new BadRequestError('ไม่สามารถลบงานตั้งต้นของระบบได้');
    }

    await repo.softDeleteSubmissionTaskAdmin(db, submissionTaskId);
    await repo.softDeleteTeamSubmissionTasksByTaskIdAdmin(db, submissionTaskId);
}

// ===== Admin team submissions viewer =====

export async function getAdminTeamSubmissions(
    db: DB,
    query: {
        teamStatus?: string | undefined;
        submissionTaskId?: number | undefined;
        teamId?: number | undefined;
        track?: 'Phenome' | 'Health' | 'City' | undefined;
        itemType?: 'file' | 'link' | undefined;
        search?: string | undefined;
        page?: number | undefined;
        pageSize?: number | undefined;
    },
) {
    const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 50, 200));
    const page = Math.max(1, Number(query.page) || 1);
    const offset = (page - 1) * pageSize;

    const filters = {
        teamStatus: query.teamStatus,
        submissionTaskId: query.submissionTaskId,
        teamId: query.teamId,
        track: query.track,
        itemType: query.itemType,
        search: query.search?.trim() || undefined,
    };

    const { rows, total } = await repo.listTeamSubmissionsAdmin(db, filters, pageSize, offset);

    const items = rows.map((row: any) => ({
        itemType: row.item_type as 'file' | 'link',
        itemId: Number(row.item_id),
        teamId: row.team_id,
        teamCode: row.team_code,
        teamNameTh: row.team_name_th,
        teamStatus: row.team_status,
        submissionTaskId: row.submission_task_id,
        taskName: row.task_name,
        taskType: row.task_type,
        stage: row.stage,
        track: row.submission_track,
        title: row.title,
        linkUrl: row.link_url,
        submittedAt: row.submitted_at,
    }));

    return { items, total, page, pageSize };
}

export async function getTeamDossier(db: DB, teamId: number) {
    const header = await repo.getTeamDossierHeader(db, teamId);
    if (!header) {
        throw new NotFoundError('ไม่พบทีมที่ต้องการ');
    }

    const [memberRows, advisorRows, submissionResult] = await Promise.all([
        repo.getTeamMembersForExport(db, [teamId]),
        repo.getTeamAdvisorsForExport(db, [teamId]),
        repo.listTeamSubmissionsAdmin(db, { teamId }, 100000, 0),
    ]);

    const team = {
        teamId: Number((header as any).team_id),
        teamCode: (header as any).team_code as string,
        teamNameTh: (header as any).team_name_th as string | null,
        teamNameEn: (header as any).team_name_en as string | null,
        description: (header as any).team_description as string | null,
        status: (header as any).status as string,
        leaderUserId: (header as any).current_leader_user_id as number | null,
        leaderName: (header as any).leader_name as string | null,
    };

    const members = memberRows.map((m) => ({
        userId: m.user_id,
        userName: m.user_name,
        userCode: m.user_code,
        role: m.role,
        firstNameTh: m.first_name_th,
        lastNameTh: m.last_name_th,
        firstNameEn: m.first_name_en,
        lastNameEn: m.last_name_en,
        email: m.email,
        phone: m.phone,
        institutionNameTh: m.institution_name_th,
        institutionNameEn: m.institution_name_en,
        gender: m.gender,
        birthDate: m.birth_date,
        educationLevel: m.education_level,
        homeProvince: m.home_province,
        cv: m.cv,
    }));

    const advisorRow = advisorRows[0];
    const advisor = advisorRow
        ? {
              prefix: advisorRow.prefix,
              firstNameTh: advisorRow.first_name_th,
              lastNameTh: advisorRow.last_name_th,
              firstNameEn: advisorRow.first_name_en,
              lastNameEn: advisorRow.last_name_en,
              email: advisorRow.email,
              phone: advisorRow.phone,
              institutionNameTh: advisorRow.institution_name_th,
          }
        : null;

    const submissions = submissionResult.rows.map((row: any) => ({
        itemType: row.item_type as 'file' | 'link',
        itemId: Number(row.item_id),
        submissionTaskId: row.submission_task_id,
        taskName: row.task_name,
        taskType: row.task_type,
        stage: row.stage,
        track: row.submission_track,
        title: row.title,
        linkUrl: row.link_url,
        submittedAt: row.submitted_at,
    }));

    return { team, members, advisor, submissions };
}

export async function openAdminSubmissionFile(db: DB, fileId: number): Promise<string> {
    const file = await repo.getSubmissionFileForOpenAdmin(db, fileId);
    if (!file) {
        throw new NotFoundError('ไม่พบไฟล์ที่ต้องการเปิด');
    }
    const shareId = await getOrCreateReviewShareId(db, {
        storageKey: file.file_storage_key,
        fileKind: 'submission_file',
        fileOriginalName: file.file_original_name,
    });
    return shareId;
}

export async function exportTeamSubmissions(
    db: DB,
    filters: {
        teamStatus?: string | undefined;
        submissionTaskId?: number | undefined;
        teamId?: number | undefined;
        track?: 'Phenome' | 'Health' | 'City' | undefined;
        itemType?: 'file' | 'link' | undefined;
        search?: string | undefined;
    },
    publicBaseUrl: string,
): Promise<{ fileName: string; stream: PassThrough }> {
    const { rows } = await repo.listTeamSubmissionsAdmin(db, {
        teamStatus: filters.teamStatus,
        submissionTaskId: filters.submissionTaskId,
        teamId: filters.teamId,
        track: filters.track,
        itemType: filters.itemType,
        search: filters.search?.trim() || undefined,
    }, 100000, 0);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('submissions');
    sheet.columns = [
        { header: 'team_code', key: 'team_code', width: 14 },
        { header: 'team_name_th', key: 'team_name_th', width: 28 },
        { header: 'team_status', key: 'team_status', width: 14 },
        { header: 'task_name', key: 'task_name', width: 28 },
        { header: 'stage', key: 'stage', width: 14 },
        { header: 'type', key: 'type', width: 8 },
        { header: 'track', key: 'track', width: 12 },
        { header: 'title', key: 'title', width: 42 },
        { header: 'submitted_at', key: 'submitted_at', width: 20 },
        { header: 'open_link', key: 'open_link', width: 52 },
    ];
    const hyperlinkStyle: Partial<ExcelJS.Font> = { color: { argb: 'FF0563C1' }, underline: true };

    for (const row of rows as any[]) {
        let openUrl = '';
        if (row.item_type === 'link') {
            openUrl = String(row.link_url || '');
        } else {
            const file = await repo.getSubmissionFileForOpenAdmin(db, Number(row.item_id));
            if (file) {
                const shareId = await getOrCreateReviewShareId(db, {
                    storageKey: file.file_storage_key,
                    fileKind: 'submission_file',
                    fileOriginalName: file.file_original_name,
                });
                openUrl = buildPublicReviewUrl(publicBaseUrl, shareId);
            }
        }

        const added = sheet.addRow({
            team_code: row.team_code,
            team_name_th: row.team_name_th || '',
            team_status: row.team_status,
            task_name: row.task_name,
            stage: row.stage,
            type: row.item_type,
            track: row.submission_track || '',
            title: row.title || '',
            submitted_at: formatDateTime(row.submitted_at),
            open_link: openUrl ? { text: row.item_type === 'link' ? 'เปิดลิงก์' : 'เปิดไฟล์', hyperlink: openUrl } : '',
        });
        if (openUrl) added.getCell('open_link').font = hyperlinkStyle;
    }

    sheet.getRow(1).font = { bold: true };

    const output = new PassThrough();
    void (async () => {
        await workbook.xlsx.write(output);
        output.end();
    })();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    return { fileName: `team_submissions_${timestamp}.xlsx`, stream: output };
}
