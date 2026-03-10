import type { DB } from '../../config/db.js';
import * as repo from './admin.repo.js';
import type { AllowlistInput, DashboardQueryInput, UpdateAllowlistInput } from './admin.schema.js';
import type {
    AllowlistResponse,
    DashboardDuplicateMemberRow,
    DashboardTeamStatus,
    ExportMemberDocumentRow,
    ExportSubmittedTeamRow,
    ExportTeamAdvisorRow,
    ExportTeamMemberRow,
    SelectionTeamRow,
} from './admin.types.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { createTeamAuditLog } from '../teams/teams.repo.js';
import { triggerNotificationEvent } from '../notifications/notifications.service.js';

const GLOBAL_SELECTION_DEADLINE_KEY = 'GLOBAL_SELECTION_CONFIRM_DEADLINE_AT';
import { PDFDocument } from 'pdf-lib';

interface TeamExportBundle {
    team: ExportSubmittedTeamRow;
    advisors: ExportTeamAdvisorRow[];
    members: ExportTeamMemberRow[];
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
    const statuses = Array.from(new Set(input.statuses)) as DashboardTeamStatus[];
    const totalTeams = await repo.getDashboardTotalTeams(db);
    const submittedOrApproved = await repo.getDashboardSubmittedOrApprovedCount(db);

    const [
        statusCountsRows,
        teamMemberCounts,
        genderCountsRows,
        provinceCountsRows,
        trendRows,
        duplicateMembers,
    ] = await Promise.all([
        repo.getDashboardStatusCounts(db, statuses),
        repo.getDashboardTeamMemberCounts(db, statuses),
        repo.getDashboardGenderCounts(db, statuses),
        repo.getDashboardProvinceCounts(db, statuses),
        repo.getDashboardTrend(db, input.days),
        repo.getDashboardDuplicateMembers(db, statuses),
    ]);

    const statusMap = new Map<DashboardTeamStatus, number>([
        ['submitted', 0],
        ['passed', 0],
        ['failed', 0],
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
        prefer_not_to_say: 0,
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
            statuses,
            days: input.days,
        },
        totals: {
            teamsCreated: totalTeams,
            teamsInSelectedStatuses: filteredTeams,
            submittedOrApproved,
            totalMembersInSelectedStatuses: totalMembers,
        },
        statusCounts: [
            { status: 'submitted', count: statusMap.get('submitted') ?? 0 },
            { status: 'passed', count: statusMap.get('passed') ?? 0 },
            { status: 'failed', count: statusMap.get('failed') ?? 0 },
        ],
        teamSizeBuckets: Object.entries(teamSizeBuckets).map(([bucket, count]) => ({ bucket, count })),
        genderCounts: Object.entries(genderCounts).map(([gender, count]) => ({ gender, count })),
        provinceCounts,
        submissionTrend: trendRows.map((row) => ({
            date: row.date_label,
            submitted: Number(row.submitted),
            passed: Number(row.passed),
            failed: Number(row.failed),
        })),
        duplicateNames,
    };
}

const VERIFICATION_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'verification');

function sanitizePathSegment(value: string | null | undefined, fallback: string): string {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    const cleaned = raw
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, ' ')
        .replace(/\.+/g, '.')
        .trim();
    return cleaned || fallback;
}

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

function resolveDocumentAbsolutePath(storageKey: string): string | null {
    const normalizedStorageKey = String(storageKey || '').replace(/\\/g, '/');
    const candidates = [
        path.join(process.cwd(), 'public', normalizedStorageKey),
        path.join(VERIFICATION_UPLOADS_DIR, normalizedStorageKey.replace(/^verification\//, '')),
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
        const absolutePath = resolveDocumentAbsolutePath(document.file_storage_key);
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

function buildAdvisorDisplayNameTh(advisor: ExportTeamAdvisorRow): string {
    return [advisor.prefix, advisor.first_name_th, advisor.last_name_th].filter(Boolean).join(' ').trim();
}

function buildAdvisorDisplayNameEn(advisor: ExportTeamAdvisorRow): string {
    return [advisor.first_name_en, advisor.last_name_en].filter(Boolean).join(' ').trim();
}

function resolveTeamSourceFolder(team: ExportSubmittedTeamRow): string | null {
    const preferred = team.team_name_th || team.team_name_en;
    const fallback = `team-${team.team_id}`;
    const candidateNames = [
        sanitizePathSegment(preferred, fallback),
        sanitizePathSegment(team.team_name_en || team.team_name_th, fallback),
        `team-${team.team_id}`,
        `team_${team.team_id}`,
    ];

    for (const name of candidateNames) {
        const absolutePath = path.join(VERIFICATION_UPLOADS_DIR, name);
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
            return absolutePath;
        }
    }

    return null;
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
        { header: 'advisor_position', key: 'advisor_position' },
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
    const advisorPositions = bundle.advisors.map((advisor) => advisor.position).filter(Boolean).join('; ');

    teamSheet.addRow({
        team_id: bundle.team.team_id,
        team_code: bundle.team.team_code,
        team_name_th: bundle.team.team_name_th,
        team_name_en: bundle.team.team_name_en,
        team_status: bundle.team.status,
        visibility: bundle.team.visibility,
        leader_user_id: bundle.team.current_leader_user_id,
        video_link: bundle.team.video_link || '',
        advisor_name_th: advisorNamesTh,
        advisor_name_en: advisorNamesEn,
        advisor_email: advisorEmails,
        advisor_phone: advisorPhones,
        advisor_institution_name_th: advisorInstitutions,
        advisor_position: advisorPositions,
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
            team_name_en: member.team_name_en,
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
    const [advisors, members, memberDocuments] = await Promise.all([
        repo.getTeamAdvisorsForExport(db, teamIds),
        repo.getTeamMembersForExport(db, teamIds),
        repo.getMemberDocumentsForExport(db, teamIds),
    ]);

    const advisorsByTeam = new Map<number, ExportTeamAdvisorRow[]>();
    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();
    const documentsByTeamAndUser = new Map<string, ExportMemberDocumentRow[]>();

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
            `${team.team_code}_${team.team_name_th || team.team_name_en || `team-${team.team_id}`}`,
            `team_${team.team_id}`,
        );
        const bundle: TeamExportBundle = {
            team,
            advisors: advisorsByTeam.get(team.team_id) ?? [],
            members: membersByTeam.get(team.team_id) ?? [],
        };

        const sourceFolder = resolveTeamSourceFolder(team);
        if (sourceFolder) {
            const submissionFilesPath = path.join(sourceFolder, 'submission_files');
            if (fs.existsSync(submissionFilesPath) && fs.statSync(submissionFilesPath).isDirectory()) {
                archive.directory(submissionFilesPath, `${exportFolderName}/submission_files/`);
            }
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
            `${team.team_code}_${team.team_name_th || team.team_name_en || `team-${team.team_id}`}`,
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

export async function getSelectionTeams(
    db: DB,
    status?: 'submitted' | 'passed' | 'failed' | 'confirmed',
): Promise<SelectionTeamRow[]> {
    return repo.listSelectionTeams(db, status);
}

export async function setSelectionResult(
    db: DB,
    data: {
        teamId: number;
        adminUserId: number;
        status: 'passed' | 'failed';
        confirmDeadlineAt?: string | null;
    },
): Promise<SelectionTeamRow> {
    const team = await repo.getSelectionTeamById(db, data.teamId);
    if (!team) throw new NotFoundError('ไม่พบทีม');

    const confirmDeadlineAt = data.status === 'passed'
        ? await getGlobalSelectionDeadline(db)
        : null;
    if (data.status === 'passed' && !confirmDeadlineAt) {
        throw new BadRequestError('ยังไม่ได้ตั้งค่า Global confirm deadline จากหน้า admin');
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

    await triggerNotificationEvent(db, {
        eventCode: data.status === 'passed' ? 'SELECTION_PASSED' : 'SELECTION_FAILED',
        teamId: data.teamId,
        actorUserId: data.adminUserId,
        extra: {
            confirmation_deadline_at: confirmDeadlineAt,
        },
    });

    const updated = await repo.getSelectionTeamById(db, data.teamId);
    if (!updated) throw new NotFoundError('ไม่พบทีมหลังอัปเดตผลคัดเลือก');
    return updated;
}

function normalizeDeadlineToDb(rawInput: string): string {
    const raw = String(rawInput || '').trim();
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
        date = new Date(`${raw}:00`);
    } else {
        date = new Date(raw);
    }
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError('รูปแบบวันเวลาหมดเขตไม่ถูกต้อง');
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export async function getGlobalSelectionDeadline(db: DB): Promise<string | null> {
    return repo.getSysConfigValue(db, GLOBAL_SELECTION_DEADLINE_KEY);
}

export async function setGlobalSelectionDeadline(db: DB, rawDeadline: string): Promise<{ confirmDeadlineAt: string }> {
    const deadline = normalizeDeadlineToDb(rawDeadline);
    await repo.upsertSysConfigValue(db, GLOBAL_SELECTION_DEADLINE_KEY, deadline);
    await repo.applyGlobalSelectionDeadlineToPassedTeams(db, deadline);
    return { confirmDeadlineAt: deadline };
}
