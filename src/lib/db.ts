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

// Create a single pool instance
const poolConfig: any = {
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error if a connection takes longer than 5 seconds
};

if (env.data.DATABASE_URL) {
  poolConfig.connectionString = env.data.DATABASE_URL;
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
