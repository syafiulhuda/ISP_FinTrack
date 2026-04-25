import { Pool } from 'pg';

// Create a single pool instance
export const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
});

// Helper for single queries
export const query = (text: string, params?: any[]) => pool.query(text, params);
