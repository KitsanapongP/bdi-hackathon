import type { RowDataPacket } from 'mysql2/promise';
import type { DB } from '../../config/db.js';
import type { ContentRewardRow, ContentSponsorRow } from './content.types.js';

export async function getEnabledRewards(db: DB): Promise<ContentRewardRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_rewards
         WHERE is_enabled = 1
         ORDER BY sort_order ASC, reward_id ASC`
    );

    return rows as ContentRewardRow[];
}

export async function getAllRewards(db: DB): Promise<ContentRewardRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_rewards
         ORDER BY sort_order ASC, reward_id ASC`
    );

    return rows as ContentRewardRow[];
}

export async function getRewardById(db: DB, rewardId: number): Promise<ContentRewardRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM content_rewards WHERE reward_id = ?`,
        [rewardId]
    );
    const result = rows as ContentRewardRow[];
    return result[0] || null;
}

export async function createReward(
    db: DB,
    data: {
        rewardRank: string;
        rewardNameTh: string;
        rewardNameEn: string;
        prizeAmount: string | number | null;
        prizeCurrency: string | null;
        prizeTextTh: string | null;
        prizeTextEn: string | null;
        descriptionTh: string | null;
        descriptionEn: string | null;
        sortOrder: number;
        isEnabled: boolean;
    }
): Promise<number> {
    const [result] = await db.query(
        `INSERT INTO content_rewards 
         (reward_rank, reward_name_th, reward_name_en, prize_amount, prize_currency, 
          prize_text_th, prize_text_en, description_th, description_en, sort_order, is_enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.rewardRank,
            data.rewardNameTh,
            data.rewardNameEn,
            data.prizeAmount,
            data.prizeCurrency,
            data.prizeTextTh,
            data.prizeTextEn,
            data.descriptionTh,
            data.descriptionEn,
            data.sortOrder,
            data.isEnabled ? 1 : 0,
        ]
    );
    return (result as any).insertId;
}

export async function updateReward(
    db: DB,
    rewardId: number,
    data: {
        rewardRank?: string;
        rewardNameTh?: string;
        rewardNameEn?: string;
        prizeAmount?: string | number | null;
        prizeCurrency?: string | null;
        prizeTextTh?: string | null;
        prizeTextEn?: string | null;
        descriptionTh?: string | null;
        descriptionEn?: string | null;
        sortOrder?: number;
        isEnabled?: boolean;
    }
): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.rewardRank !== undefined) { fields.push('reward_rank = ?'); values.push(data.rewardRank); }
    if (data.rewardNameTh !== undefined) { fields.push('reward_name_th = ?'); values.push(data.rewardNameTh); }
    if (data.rewardNameEn !== undefined) { fields.push('reward_name_en = ?'); values.push(data.rewardNameEn); }
    if (data.prizeAmount !== undefined) { fields.push('prize_amount = ?'); values.push(data.prizeAmount); }
    if (data.prizeCurrency !== undefined) { fields.push('prize_currency = ?'); values.push(data.prizeCurrency); }
    if (data.prizeTextTh !== undefined) { fields.push('prize_text_th = ?'); values.push(data.prizeTextTh); }
    if (data.prizeTextEn !== undefined) { fields.push('prize_text_en = ?'); values.push(data.prizeTextEn); }
    if (data.descriptionTh !== undefined) { fields.push('description_th = ?'); values.push(data.descriptionTh); }
    if (data.descriptionEn !== undefined) { fields.push('description_en = ?'); values.push(data.descriptionEn); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isEnabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }

    if (fields.length === 0) return;

    values.push(rewardId);
    await db.query(
        `UPDATE content_rewards SET ${fields.join(', ')} WHERE reward_id = ?`,
        values
    );
}

export async function deleteReward(db: DB, rewardId: number): Promise<void> {
    await db.query(`DELETE FROM content_rewards WHERE reward_id = ?`, [rewardId]);
}

export async function getEnabledSponsors(db: DB, tierCode?: string): Promise<ContentSponsorRow[]> {
    const query = tierCode
        ? `SELECT *
           FROM content_sponsors
           WHERE is_enabled = 1 AND tier_code = ?
           ORDER BY sort_order ASC, sponsor_id ASC`
        : `SELECT *
           FROM content_sponsors
           WHERE is_enabled = 1
           ORDER BY sort_order ASC, sponsor_id ASC`;

    const params = tierCode ? [tierCode] : [];
    const [rows] = await db.query<RowDataPacket[]>(query, params);

    return rows as ContentSponsorRow[];
}
