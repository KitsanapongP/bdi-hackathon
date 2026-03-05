import type { DB } from '../../config/db.js';
import * as repo from './admin.repo.js';
import type { AllowlistInput, DashboardQueryInput, UpdateAllowlistInput } from './admin.schema.js';
import type {
    AllowlistResponse,
    DashboardDuplicateMemberRow,
    DashboardTeamStatus,
} from './admin.types.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';

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
