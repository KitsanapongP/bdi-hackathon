import type { DB } from '../../config/db.js';
import type { ConsentDocRow, UserConsentRow } from './consent.types.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/** Get all active consent documents */
export async function getActiveDocuments(db: DB): Promise<ConsentDocRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM user_consent_documents WHERE is_active = 1 ORDER BY consent_doc_id`,
    );
    return rows as ConsentDocRow[];
}

/** Get a specific consent document by ID */
export async function getDocumentById(db: DB, docId: number): Promise<ConsentDocRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM user_consent_documents WHERE consent_doc_id = :docId LIMIT 1`,
        { docId },
    );
    return (rows[0] as ConsentDocRow | undefined) ?? null;
}

/** Get all consent records for a user */
export async function getUserConsents(db: DB, userId: number): Promise<(UserConsentRow & Pick<ConsentDocRow, 'doc_code' | 'version' | 'title_th' | 'title_en'>)[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT uc.*, cd.doc_code, cd.version, cd.title_th, cd.title_en
         FROM user_consents uc
         INNER JOIN user_consent_documents cd ON cd.consent_doc_id = uc.consent_doc_id
         WHERE uc.user_id = :userId
         ORDER BY uc.accepted_at DESC`,
        { userId },
    );
    return rows as (UserConsentRow & Pick<ConsentDocRow, 'doc_code' | 'version' | 'title_th' | 'title_en'>)[];
}

/** Check if user already accepted a specific document */
export async function hasAccepted(db: DB, userId: number, consentDocId: number): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 1 FROM user_consents WHERE user_id = :userId AND consent_doc_id = :consentDocId LIMIT 1`,
        { userId, consentDocId },
    );
    return rows.length > 0;
}

/** Record user acceptance of a consent document */
export async function acceptDocument(
    db: DB,
    data: { userId: number; consentDocId: number; acceptSource: string; acceptIp: string; userAgent: string },
): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO user_consents (user_id, consent_doc_id, accepted_at, accept_source, accept_ip, user_agent, created_at)
         VALUES (:userId, :consentDocId, NOW(), :acceptSource, :acceptIp, :userAgent, NOW())`,
        data,
    );
    return result.insertId;
}
