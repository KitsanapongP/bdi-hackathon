import type { DB } from '../../config/db.js';
import * as repo from './admin.repo.js';
import type { AllowlistInput, DashboardQueryInput, UpdateAllowlistInput } from './admin.schema.js';
import type {
    AllowlistResponse,
    DashboardDuplicateMemberRow,
    DashboardTeamStatus,
    ExportSubmittedTeamRow,
    ExportTeamAdvisorRow,
    ExportTeamMemberRow,
} from './admin.types.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import archiver from 'archiver';

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
        ['approved', 0],
        ['rejected', 0],
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
            { status: 'approved', count: statusMap.get('approved') ?? 0 },
            { status: 'rejected', count: statusMap.get('rejected') ?? 0 },
        ],
        teamSizeBuckets: Object.entries(teamSizeBuckets).map(([bucket, count]) => ({ bucket, count })),
        genderCounts: Object.entries(genderCounts).map(([gender, count]) => ({ gender, count })),
        provinceCounts,
        submissionTrend: trendRows.map((row) => ({
            date: row.date_label,
            submitted: Number(row.submitted),
            approved: Number(row.approved),
            rejected: Number(row.rejected),
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

function formatDateTime(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value);
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
        { header: 'approved_at', key: 'approved_at' },
        { header: 'selected_at', key: 'selected_at' },
        { header: 'rejected_at', key: 'rejected_at' },
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
        approved_at: formatDateTime(bundle.team.approved_at),
        selected_at: formatDateTime(bundle.team.selected_at),
        rejected_at: formatDateTime(bundle.team.rejected_at),
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
    const [advisors, members] = await Promise.all([
        repo.getTeamAdvisorsForExport(db, teamIds),
        repo.getTeamMembersForExport(db, teamIds),
    ]);

    const advisorsByTeam = new Map<number, ExportTeamAdvisorRow[]>();
    const membersByTeam = new Map<number, ExportTeamMemberRow[]>();

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
            archive.directory(sourceFolder, `${exportFolderName}/`);
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
