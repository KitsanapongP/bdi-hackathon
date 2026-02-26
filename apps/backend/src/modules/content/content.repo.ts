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
