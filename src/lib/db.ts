import { Pool } from 'pg';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_USER: z.string().min(1, "DATABASE_USER is required"),
  DATABASE_HOST: z.string().min(1, "DATABASE_HOST is required"),
  DATABASE_NAME: z.string().min(1, "DATABASE_NAME is required"),
  DATABASE_PASSWORD: z.string().min(1, "DATABASE_PASSWORD is required"),
  DATABASE_PORT: z.string().default('5432'),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.format());
  throw new Error('Invalid environment variables. Please check your .env.local file.');
}

// Create a single pool instance
export const pool = new Pool({
  user: env.data.DATABASE_USER,
  host: env.data.DATABASE_HOST,
  database: env.data.DATABASE_NAME,
  password: env.data.DATABASE_PASSWORD,
  port: parseInt(env.data.DATABASE_PORT),
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error if a connection takes longer than 5 seconds
});

// Helper for single queries
export const query = (text: string, params?: any[]) => pool.query(text, params);
