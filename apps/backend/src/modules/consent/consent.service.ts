import type { DB } from '../../config/db.js';
import type { ConsentDocSafe, UserConsentSafe } from './consent.types.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import * as repo from './consent.repo.js';

/** Get all active consent documents */
export async function getActiveDocuments(db: DB): Promise<ConsentDocSafe[]> {
    const rows = await repo.getActiveDocuments(db);
    return rows.map((r) => ({
        consentDocId: r.consent_doc_id,
        docCode: r.doc_code,
        version: r.version,
        titleTh: r.title_th,
        titleEn: r.title_en,
        contentTh: r.content_th,
        contentEn: r.content_en,
        publishedAt: r.published_at,
    }));
}

/** Get user's consent status for all active documents */
export async function getUserConsentStatus(db: DB, userId: number): Promise<UserConsentSafe[]> {
    const docs = await repo.getActiveDocuments(db);
    const consents = await repo.getUserConsents(db, userId);

    // Map each active doc to the user's acceptance status
    return docs.map((doc) => {
        const consent = consents.find((c) => c.consent_doc_id === doc.consent_doc_id);
        return {
            consentDocId: doc.consent_doc_id,
            docCode: doc.doc_code,
            version: doc.version,
            titleTh: doc.title_th,
            titleEn: doc.title_en,
            accepted: !!consent,
            acceptedAt: consent?.accepted_at ?? null,
        };
    });
}

/** Accept a consent document */
export async function acceptDocument(
    db: DB,
    userId: number,
    consentDocId: number,
    meta: { acceptSource: string; acceptIp: string; userAgent: string },
): Promise<void> {
    // Verify document exists and is active
    const doc = await repo.getDocumentById(db, consentDocId);
    if (!doc || !doc.is_active) {
        throw new NotFoundError('ไม่พบเอกสารข้อตกลง');
    }

    // Check if already accepted
    const already = await repo.hasAccepted(db, userId, consentDocId);
    if (already) {
        throw new ConflictError('ยอมรับข้อตกลงนี้แล้ว');
    }

    await repo.acceptDocument(db, {
        userId,
        consentDocId,
        ...meta,
    });
}
