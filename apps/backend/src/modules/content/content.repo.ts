import type { RowDataPacket } from 'mysql2/promise';
import type { DB } from '../../config/db.js';
import type { ContentRewardRow } from './content.types.js';

export async function getEnabledRewards(db: DB): Promise<ContentRewardRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_rewards
         WHERE is_enabled = 1
         ORDER BY sort_order ASC, reward_id ASC`
    );

    return rows as ContentRewardRow[];
}
