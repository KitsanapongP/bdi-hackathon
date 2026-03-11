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

    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000,

    // Uncomment this if your hosting requires / behaves better with SSL
    // ssl: {},
  });
}

export async function pingDB(db: DB) {
  let conn: mysql.PoolConnection | undefined;

  try {
    conn = await db.getConnection();
    await conn.ping();
    const [rows] = await conn.query('SELECT 1 AS ok');
    console.log('✅ Database connected:', rows);
  } catch (err) {
    console.error('❌ Database ping failed:', err);
    throw err;
  } finally {
    conn?.release();
  }
}