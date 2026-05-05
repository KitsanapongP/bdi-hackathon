import type { DB } from '../../config/db.js';
import { NotFoundError } from '../../shared/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';

type ReviewFileKind = 'video' | 'submission_file' | 'member_document';

const REVIEW_BUNDLE_PREFIX = 'bundle_member_docs:';
const REVIEW_CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'review_cache');
const REVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ShareRow {
    share_id: string;
    file_storage_key: string;
    file_kind: ReviewFileKind;
    file_original_name: string | null;
    revoked_at: Date | null;
}

export async function ensureReviewShareTable(db: DB): Promise<void> {
    await db.query(`
        CREATE TABLE IF NOT EXISTS review_file_shares (
            review_file_share_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            share_id VARCHAR(64) NOT NULL,
            file_storage_key VARCHAR(1024) NOT NULL,
            file_kind ENUM('video','submission_file','member_document') NOT NULL,
            file_original_name VARCHAR(255) NULL,
            revoked_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (review_file_share_id),
            UNIQUE KEY uq_share_id (share_id),
            KEY idx_storage_key_active (file_storage_key(255), revoked_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

export async function getOrCreateReviewShareId(
    db: DB,
    input: { storageKey: string; fileKind: ReviewFileKind; fileOriginalName?: string | null },
): Promise<string> {
    await ensureReviewShareTable(db);

    const normalizedKey = String(input.storageKey || '').trim().replace(/\\/g, '/');
    const [existingRows] = await db.query<any[]>(`
        SELECT share_id
        FROM review_file_shares
        WHERE file_storage_key = :fileStorageKey
          AND file_kind = :fileKind
          AND revoked_at IS NULL
        ORDER BY review_file_share_id DESC
        LIMIT 1
    `, {
        fileStorageKey: normalizedKey,
        fileKind: input.fileKind,
    });

    const existingShareId = existingRows[0]?.share_id;
    if (existingShareId) return String(existingShareId);

    const shareId = crypto.randomBytes(24).toString('hex');
    await db.query(`
        INSERT INTO review_file_shares
            (share_id, file_storage_key, file_kind, file_original_name)
        VALUES
            (:shareId, :fileStorageKey, :fileKind, :fileOriginalName)
    `, {
        shareId,
        fileStorageKey: normalizedKey,
        fileKind: input.fileKind,
        fileOriginalName: input.fileOriginalName ?? null,
    });

    return shareId;
}

export function buildMemberDocumentBundleStorageKey(teamId: number, userId: number): string {
    return `${REVIEW_BUNDLE_PREFIX}${teamId}:${userId}`;
}

function resolveAbsolutePathFromStorageKey(storageKey: string): string | null {
    const normalizedStorageKey = String(storageKey || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalizedStorageKey) return null;

    const candidates = [
        path.join(process.cwd(), 'public', normalizedStorageKey),
        path.join(process.cwd(), 'public', 'uploads', normalizedStorageKey.replace(/^uploads\//, '')),
        path.join(process.cwd(), 'public', 'uploads', 'verification', normalizedStorageKey.replace(/^verification\//, '')),
    ];
    const absolutePath = candidates.find((candidate) => fs.existsSync(candidate));
    return absolutePath || null;
}

export async function getReviewFileByShareId(
    db: DB,
    shareId: string,
): Promise<{ absolutePath: string; fileOriginalName: string; fileKind: ReviewFileKind; contentType: string }> {
    await ensureReviewShareTable(db);
    const [rows] = await db.query<any[]>(`
        SELECT share_id, file_storage_key, file_kind, file_original_name, revoked_at
        FROM review_file_shares
        WHERE share_id = :shareId
        LIMIT 1
    `, { shareId });

    const row = rows[0] as ShareRow | undefined;
    if (!row || row.revoked_at) {
        throw new NotFoundError('ไม่พบลิงก์ไฟล์ที่ต้องการ');
    }

    if (String(row.file_storage_key || '').startsWith(REVIEW_BUNDLE_PREFIX)) {
        const result = await buildMemberDocumentBundleFile(db, row.file_storage_key);
        return {
            absolutePath: result.absolutePath,
            fileOriginalName: row.file_original_name || result.fileName,
            fileKind: row.file_kind,
            contentType: 'application/pdf',
        };
    }

    const absolutePath = resolveAbsolutePathFromStorageKey(row.file_storage_key);
    if (!absolutePath) {
        throw new NotFoundError('ไม่พบไฟล์ที่ต้องการ');
    }

    const fallbackName = path.basename(absolutePath);
    const ext = path.extname(row.file_original_name || fallbackName).toLowerCase();
    const contentType = ext === '.pdf'
        ? 'application/pdf'
        : ext === '.mp4'
            ? 'video/mp4'
            : 'application/octet-stream';

    return {
        absolutePath,
        fileOriginalName: row.file_original_name || fallbackName,
        fileKind: row.file_kind,
        contentType,
    };
}

async function buildMemberDocumentBundleFile(
    db: DB,
    storageKey: string,
): Promise<{ absolutePath: string; fileName: string }> {
    const parsed = String(storageKey || '').replace(REVIEW_BUNDLE_PREFIX, '').split(':');
    const teamId = Number(parsed[0]);
    const userId = Number(parsed[1]);
    if (!Number.isFinite(teamId) || !Number.isFinite(userId)) {
        throw new NotFoundError('ข้อมูลลิงก์เอกสารไม่ถูกต้อง');
    }

    if (!fs.existsSync(REVIEW_CACHE_DIR)) {
        fs.mkdirSync(REVIEW_CACHE_DIR, { recursive: true });
    }

    const cacheFileName = `member_docs_bundle_team_${teamId}_user_${userId}.pdf`;
    const cachePath = path.join(REVIEW_CACHE_DIR, cacheFileName);
    if (fs.existsSync(cachePath)) {
        const stat = fs.statSync(cachePath);
        if (Date.now() - stat.mtimeMs <= REVIEW_CACHE_TTL_MS) {
            return { absolutePath: cachePath, fileName: cacheFileName };
        }
    }

    const [rows] = await db.query<any[]>(`
        SELECT file_storage_key, uploaded_at
        FROM verify_member_documents
        WHERE team_id = :teamId
          AND user_id = :userId
          AND is_current = 1
          AND deleted_at IS NULL
        ORDER BY uploaded_at DESC, document_id DESC
    `, { teamId, userId });

    if (rows.length === 0) {
        throw new NotFoundError('ไม่พบเอกสารยืนยันตัวตนของสมาชิก');
    }

    const outputPdf = await PDFDocument.create();
    let mergedPageCount = 0;
    for (const row of rows) {
        const absolutePath = resolveAbsolutePathFromStorageKey(row.file_storage_key);
        if (!absolutePath) continue;
        const bytes = fs.readFileSync(absolutePath);
        const inputPdf = await PDFDocument.load(bytes);
        const pages = await outputPdf.copyPages(inputPdf, inputPdf.getPageIndices());
        pages.forEach((page) => outputPdf.addPage(page));
        mergedPageCount += pages.length;
    }

    if (mergedPageCount === 0) {
        throw new NotFoundError('ไม่พบไฟล์เอกสารที่พร้อมใช้งาน');
    }

    const mergedBytes = await outputPdf.save();
    fs.writeFileSync(cachePath, Buffer.from(mergedBytes));
    return {
        absolutePath: cachePath,
        fileName: cacheFileName,
    };
}
