import { Pool } from 'pg';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DATABASE_USER: z.string().optional(),
  DATABASE_HOST: z.string().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_PORT: z.string().default('5432'),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.format());
  throw new Error('Invalid environment variables. Please check your .env.local file.');
}

import { PoolConfig } from 'pg';

const isServerless = process.env.VERCEL === '1';

// Create a single pool instance
const poolConfig: PoolConfig = {
  max: isServerless ? 2 : 10, // Maximum number of clients in the pool
  idleTimeoutMillis: isServerless ? 15000 : 30000, // Close idle clients sooner in serverless
  connectionTimeoutMillis: 30000, // 30 seconds to allow for Neon scale-to-zero cold starts
};

if (env.data.DATABASE_URL) {
  poolConfig.connectionString = env.data.DATABASE_URL.replace('sslmode=require', 'sslmode=verify-full');
} else if (env.data.DATABASE_USER && env.data.DATABASE_HOST && env.data.DATABASE_NAME && env.data.DATABASE_PASSWORD) {
  poolConfig.user = env.data.DATABASE_USER;
  poolConfig.host = env.data.DATABASE_HOST;
  poolConfig.database = env.data.DATABASE_NAME;
  poolConfig.password = env.data.DATABASE_PASSWORD;
  poolConfig.port = parseInt(env.data.DATABASE_PORT);
} else {
  throw new Error('Database connection variables are missing.');
}

export const pool = new Pool(poolConfig);

// Helper for single queries
export const query = (text: string, params?: any[]) => pool.query(text, params);

// ============================================================
// REGISTER DATABASE WRITER FOR BROWSER-SAFE logger.ts
// ============================================================
import { logger } from './logger';

let isLogsTableInitialized = false;
export async function ensureLogsTableExists() {
  if (isLogsTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        context JSONB,
        error_stack TEXT,
        path VARCHAR(255),
        user_id VARCHAR(100),
        environment VARCHAR(50) DEFAULT 'production',
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
      CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
    `);
    isLogsTableInitialized = true;
  } catch (err) {
    console.error('Failed to initialize system_logs table:', err);
  }
}

logger.registerDbWriter(async (level, payload) => {
  // Only write to DB in production (or if forced)
  if (process.env.NODE_ENV !== 'production' && !process.env.FORCE_DB_LOGS) {
    return;
  }
  
  try {
    await ensureLogsTableExists();
    
    let errorStack = undefined;
    if (payload.error instanceof Error) {
      errorStack = payload.error.stack;
    } else if (payload.error && typeof payload.error === 'object') {
      errorStack = JSON.stringify(payload.error);
    } else if (payload.error) {
      errorStack = String(payload.error);
    }

    await query(`
      INSERT INTO system_logs (level, message, context, error_stack, path, user_id, environment)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      level.toUpperCase(),
      payload.message,
      payload.context ? JSON.stringify(payload.context) : null,
      errorStack || null,
      payload.path || 'unknown',
      payload.user_id || null,
      process.env.NODE_ENV || 'production'
    ]);
  } catch (dbErr) {
    console.error('Failed to write log to database:', dbErr);
  }
});
