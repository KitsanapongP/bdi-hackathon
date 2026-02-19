import mysql from 'mysql2/promise';
import type { Env } from './env.js';

export type DB = mysql.Pool;

export function createDB(env: Env): DB {
  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
}

export async function pingDB(db: DB) {
  await db.query('SELECT 1');
}
