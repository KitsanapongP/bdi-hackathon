import type { DB } from '../../config/db.js';
import type { TeamVerificationResponse } from './verification.types.js';
import * as repo from './verification.repo.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../shared/errors.js';
import { failTeamIfConfirmationExpired, getTeamById, getTeamMembers } from '../teams/teams.repo.js';
import * as notificationService from '../notifications/notifications.service.js';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'verification');
const DEFAULT_REQUIREMENT_ID = 5002; // STUDENT_ID requirement

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

export async function getTeamVerificationStatus(
    db: DB,
    teamId: number,
    userId: number
): Promise<TeamVerificationResponse> {
    await failTeamIfConfirmationExpired(db, teamId);
    const team = await getTeamById(db, teamId);
    if (!team) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e17\u0e35\u0e21');

    const round = await repo.getLatestVerifyRound(db, teamId);
    const members = await repo.getTeamVerificationMembers(db, teamId, round?.verify_round_id ?? null);
    const myDocs = await repo.getDocumentsByTeamAndUser(db, teamId, userId);
    const myProfile = await repo.getVerifyProfile(db, teamId, userId, round?.verify_round_id ?? null);

    const isTeamSubmitted = team.status === 'submitted' || team.status === 'passed' ||
        (round?.status === 'submitted' || round?.status === 'completed');

    return {
        teamId: team.team_id,
        teamStatus: team.status,
        roundId: round?.verify_round_id ?? null,
        roundStatus: round?.status ?? null,
        isTeamSubmitted,
        members: members.map((m: any) => ({
            user_id: m.user_id,
            user_name: m.user_name,
            first_name_th: m.first_name_th,
            last_name_th: m.last_name_th,
            institution_name_th: m.institution_name_th,
            email: m.email,
            role: m.role,
            is_member_confirmed: m.is_member_confirmed === 1,
            member_confirmed_at: m.member_confirmed_at,
            document_count: Number(m.document_count),
        })),
        myDocuments: myDocs,
        myProfile,
    };
}

export async function uploadDocument(
    db: DB,
    teamId: number,
    userId: number,
    file: { filename: string; mimetype: string; file: NodeJS.ReadableStream }
): Promise<{ documentId: number; fileName: string }> {
    // Validate team membership
    const team = await getTeamById(db, teamId);
    if (!team) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e17\u0e35\u0e21');

    // Check if team is already submitted (locked)
    const round = await repo.getLatestVerifyRound(db, teamId);
    if (round && (round.status === 'submitted' || round.status === 'locked' || round.status === 'completed')) {
        throw new BadRequestError('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e44\u0e14\u0e49 \u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e32\u0e01\u0e17\u0e35\u0e21\u0e2a\u0e48\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
    }

    // Check if member is confirmed (must unconfirm first)
    const profile = await repo.getVerifyProfile(db, teamId, userId, round?.verify_round_id ?? null);
    if (profile && profile.is_member_confirmed === 1) {
        throw new BadRequestError('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e01\u0e48\u0e2d\u0e19\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e43\u0e2b\u0e21\u0e48');
    }

    // Validate file type
    if (file.mimetype !== 'application/pdf') {
        throw new BadRequestError('\u0e23\u0e2d\u0e07\u0e23\u0e31\u0e1a\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e44\u0e1f\u0e25\u0e4c PDF \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19');
    }

    // Ensure round exists
    const currentRound = await repo.getOrCreateVerifyRound(db, teamId, userId);

    // Ensure profile exists
    if (!profile) {
        await repo.upsertVerifyProfile(db, {
            verifyRoundId: currentRound.verify_round_id,
            teamId,
            userId,
        });
    }

    // Save file to disk
    const members = await getTeamMembers(db, teamId);
    const me = members.find((m: any) => m.user_id === userId);
    const teamFolder = sanitizePathSegment(team.team_name_th || team.team_name_en, `team-${teamId}`);
    const memberDisplayName = (me?.show_real_name && me?.first_name_th)
        ? me.first_name_th
        : (me?.user_name || `user-${userId}`);
    const memberFolder = sanitizePathSegment(memberDisplayName, `user-${userId}`);
    const uploadDir = path.join(UPLOADS_DIR, teamFolder, memberFolder);
    fs.mkdirSync(uploadDir, { recursive: true });

    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const safeFileName = `${Date.now()}_${uniqueSuffix}_${file.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    const storageKey = path.posix.join('verification', teamFolder, memberFolder, safeFileName);

    // Write file
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
        chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(filePath, buffer);

    // Insert document record
    const documentId = await repo.insertDocument(db, {
        verifyRoundId: currentRound.verify_round_id,
        teamId,
        userId,
        requirementId: DEFAULT_REQUIREMENT_ID,
        fileStorageKey: storageKey,
        fileOriginalName: file.filename,
        fileMimeType: file.mimetype,
        fileSizeBytes: buffer.length,
    });

    // Audit log
    await repo.createVerifyAuditLog(db, {
        verifyRoundId: currentRound.verify_round_id,
        teamId,
        actorUserId: userId,
        actionCode: 'DOC_UPLOADED',
        actionDetail: JSON.stringify({ documentId, fileName: file.filename }),
    });

    return { documentId, fileName: file.filename };
}

export async function deleteDocument(
    db: DB,
    teamId: number,
    userId: number,
    documentId: number
): Promise<void> {
    const doc = await repo.getDocumentById(db, documentId);
    if (!doc) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23');
    if (doc.team_id !== teamId || doc.user_id !== userId) {
        throw new UnauthorizedError('\u0e04\u0e38\u0e13\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e25\u0e1a\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e19\u0e35\u0e49');
    }

    const round = await repo.getLatestVerifyRound(db, teamId);
    if (round && (round.status === 'submitted' || round.status === 'locked' || round.status === 'completed')) {
        throw new BadRequestError('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e25\u0e1a\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e44\u0e14\u0e49 \u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e32\u0e01\u0e17\u0e35\u0e21\u0e2a\u0e48\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
    }

    const profile = await repo.getVerifyProfile(db, teamId, userId, round?.verify_round_id ?? null);
    if (profile && profile.is_member_confirmed === 1) {
        throw new BadRequestError('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e01\u0e48\u0e2d\u0e19\u0e25\u0e1a\u0e44\u0e1f\u0e25\u0e4c');
    }

    await repo.softDeleteDocument(db, documentId);

    await repo.createVerifyAuditLog(db, {
        verifyRoundId: round?.verify_round_id ?? null,
        teamId,
        actorUserId: userId,
        actionCode: 'DOC_DELETED',
        actionDetail: JSON.stringify({ documentId, fileName: doc.file_original_name }),
    });
}

export async function getMyDocumentFileInfo(
    db: DB,
    teamId: number,
    userId: number,
    documentId: number
): Promise<{ absolutePath: string; fileOriginalName: string; fileMimeType: string }> {
    const doc = await repo.getDocumentById(db, documentId);
    if (!doc) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23');
    if (doc.team_id !== teamId || doc.user_id !== userId) {
        throw new UnauthorizedError('\u0e04\u0e38\u0e13\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e19\u0e35\u0e49');
    }

    const normalizedStorageKey = String(doc.file_storage_key || '').replace(/\\/g, '/');
    const candidates = [
        path.join(process.cwd(), 'public', 'uploads', normalizedStorageKey),
        path.join(UPLOADS_DIR, normalizedStorageKey.replace(/^verification\//, '')),
        path.join(UPLOADS_DIR, String(teamId), String(userId), path.basename(normalizedStorageKey)),
    ];
    const absolutePath = candidates.find((p) => fs.existsSync(p));
    if (!absolutePath) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e44\u0e1f\u0e25\u0e4c\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23');

    const mime = doc.file_mime_type || 'application/pdf';
    let originalName = doc.file_original_name || 'document.pdf';
    if (mime === 'application/pdf' && !/\.pdf$/i.test(originalName)) {
        originalName = `${originalName}.pdf`;
    }

    return {
        absolutePath,
        fileOriginalName: originalName,
        fileMimeType: mime,
    };
}

export async function renameMyDocument(
    db: DB,
    teamId: number,
    userId: number,
    documentId: number,
    fileOriginalName: string
): Promise<void> {
    const nextName = String(fileOriginalName || '').trim();
    if (!nextName) throw new BadRequestError('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e0a\u0e37\u0e48\u0e2d\u0e44\u0e1f\u0e25\u0e4c');
    if (nextName.length > 255) throw new BadRequestError('\u0e0a\u0e37\u0e48\u0e2d\u0e44\u0e1f\u0e25\u0e4c\u0e22\u0e32\u0e27\u0e40\u0e01\u0e34\u0e19\u0e44\u0e1b');

    const doc = await repo.getDocumentById(db, documentId);
    if (!doc) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23');
    if (doc.team_id !== teamId || doc.user_id !== userId) {
        throw new UnauthorizedError('\u0e04\u0e38\u0e13\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e41\u0e01\u0e49\u0e44\u0e02\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e19\u0e35\u0e49');
    }

    const round = await repo.getLatestVerifyRound(db, teamId);
    if (round && (round.status === 'submitted' || round.status === 'locked' || round.status === 'completed')) {
        throw new BadRequestError('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e41\u0e01\u0e49\u0e44\u0e02\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e44\u0e14\u0e49 \u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e32\u0e01\u0e17\u0e35\u0e21\u0e2a\u0e48\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
    }

    const profile = await repo.getVerifyProfile(db, teamId, userId, round?.verify_round_id ?? null);
    if (profile && profile.is_member_confirmed === 1) {
        throw new BadRequestError('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e01\u0e48\u0e2d\u0e19\u0e41\u0e01\u0e49\u0e44\u0e02\u0e0a\u0e37\u0e48\u0e2d\u0e44\u0e1f\u0e25\u0e4c');
    }

    await repo.updateDocumentOriginalName(db, documentId, nextName);

    await repo.createVerifyAuditLog(db, {
        verifyRoundId: round?.verify_round_id ?? null,
        teamId,
        actorUserId: userId,
        actionCode: 'DOC_RENAMED',
        actionDetail: JSON.stringify({ documentId, fileOriginalName: nextName }),
    });
}

export async function confirmMember(
    db: DB,
    teamId: number,
    userId: number
): Promise<void> {
    const team = await getTeamById(db, teamId);
    if (!team) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e17\u0e35\u0e21');

    const round = await repo.getLatestVerifyRound(db, teamId);
    if (round && (round.status === 'submitted' || round.status === 'locked' || round.status === 'completed')) {
        throw new BadRequestError('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e44\u0e14\u0e49 \u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e32\u0e01\u0e17\u0e35\u0e21\u0e2a\u0e48\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
    }

    // Check docs exist
    const docs = await repo.getDocumentsByTeamAndUser(db, teamId, userId);
    if (docs.length === 0) {
        throw new BadRequestError('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 1 \u0e44\u0e1f\u0e25\u0e4c\u0e01\u0e48\u0e2d\u0e19\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19');
    }

    // Ensure profile exists
    const currentRound = await repo.getOrCreateVerifyRound(db, teamId, userId);
    const profile = await repo.getVerifyProfile(db, teamId, userId, currentRound.verify_round_id);
    if (!profile) {
        await repo.upsertVerifyProfile(db, {
            verifyRoundId: currentRound.verify_round_id,
            teamId,
            userId,
        });
    }

    await repo.setMemberConfirmed(db, currentRound.verify_round_id, teamId, userId);

    await repo.createVerifyAuditLog(db, {
        verifyRoundId: currentRound.verify_round_id,
        teamId,
        actorUserId: userId,
        actionCode: 'MEMBER_CONFIRMED',
    });
}

export async function unconfirmMember(
    db: DB,
    teamId: number,
    userId: number
): Promise<void> {
    const round = await repo.getLatestVerifyRound(db, teamId);
    if (round && (round.status === 'submitted' || round.status === 'locked' || round.status === 'completed')) {
        throw new BadRequestError('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e44\u0e14\u0e49 \u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e32\u0e01\u0e2b\u0e31\u0e27\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e21\u0e2a\u0e48\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
    }

    const currentRound = await repo.getOrCreateVerifyRound(db, teamId, userId);
    await repo.setMemberUnconfirmed(db, currentRound.verify_round_id, teamId, userId);

    await repo.createVerifyAuditLog(db, {
        verifyRoundId: currentRound.verify_round_id,
        teamId,
        actorUserId: userId,
        actionCode: 'MEMBER_UNCONFIRMED',
    });
}

export async function submitTeam(
    db: DB,
    teamId: number,
    leaderUserId: number
): Promise<void> {
    const team = await getTeamById(db, teamId);
    if (!team) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e17\u0e35\u0e21');
    if (team.current_leader_user_id !== leaderUserId) {
        throw new UnauthorizedError('\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e2b\u0e31\u0e27\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e21\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19\u0e17\u0e35\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2a\u0e48\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e44\u0e14\u0e49');
    }

    const round = await repo.getOrCreateVerifyRound(db, teamId, leaderUserId);
    const allConfirmed = await repo.areAllMembersConfirmed(db, teamId, round.verify_round_id);
    if (!allConfirmed) {
        throw new BadRequestError('\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01\u0e17\u0e38\u0e01\u0e04\u0e19\u0e15\u0e49\u0e2d\u0e07\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e01\u0e48\u0e2d\u0e19\u0e2a\u0e48\u0e07');
    }
    if (round.status === 'submitted' || round.status === 'completed') {
        throw new BadRequestError('\u0e17\u0e35\u0e21\u0e2a\u0e48\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
    }

    await repo.lockVerifyRound(db, round.verify_round_id);
    await repo.submitVerifyRound(db, round.verify_round_id);
    await repo.updateTeamStatus(db, teamId, 'submitted');

    await repo.createVerifyAuditLog(db, {
        verifyRoundId: round.verify_round_id,
        teamId,
        actorUserId: leaderUserId,
        actionCode: 'TEAM_SUBMITTED',
    });

    await notificationService.triggerNotificationEvent(db, {
        eventCode: 'IDENTITY_SUBMITTED',
        teamId,
        actorUserId: leaderUserId,
    });
}

export async function disbandTeamAction(
    db: DB,
    teamId: number,
    leaderUserId: number,
    reason: string
): Promise<void> {
    const team = await getTeamById(db, teamId);
    if (!team) throw new NotFoundError('\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e17\u0e35\u0e21');
    if (team.current_leader_user_id !== leaderUserId) {
        throw new UnauthorizedError('\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e2b\u0e31\u0e27\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e21\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19\u0e17\u0e35\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e22\u0e38\u0e1a\u0e17\u0e35\u0e21\u0e44\u0e14\u0e49');
    }

    if (!reason || reason.trim().length === 0) {
        throw new BadRequestError('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e40\u0e2b\u0e15\u0e38\u0e1c\u0e25\u0e43\u0e19\u0e01\u0e32\u0e23\u0e22\u0e38\u0e1a\u0e17\u0e35\u0e21');
    }

    await repo.disbandTeam(db, teamId, leaderUserId, reason.trim());

    const round = await repo.getLatestVerifyRound(db, teamId);
    await repo.createVerifyAuditLog(db, {
        verifyRoundId: round?.verify_round_id ?? null,
        teamId,
        actorUserId: leaderUserId,
        actionCode: 'TEAM_DISBANDED',
        actionDetail: JSON.stringify({ reason: reason.trim() }),
    });
}
