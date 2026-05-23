import { query } from './db';

let isTableInitialized = false;

async function initializeTable() {
  if (isTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key VARCHAR(255) PRIMARY KEY,
        points INT NOT NULL,
        expire_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limits_expire_at ON rate_limits(expire_at);
    `);
    isTableInitialized = true;
  } catch (err) {
    console.error('Failed to initialize rate_limits table:', err);
  }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number; reset: Date }> {
  const now = new Date();
  const resetTime = new Date(now.getTime() + windowSeconds * 1000);

  try {
    await initializeTable();

    // Clean up expired rate limits first for this key
    await query(`DELETE FROM rate_limits WHERE expire_at < NOW()`);

    // Select the current rate limit for the key
    const res = await query(`SELECT points, expire_at FROM rate_limits WHERE key = $1`, [key]);

    if (res.rows.length === 0) {
      // Insert new rate limit record
      await query(`
        INSERT INTO rate_limits (key, points, expire_at)
        VALUES ($1, 1, $2)
        ON CONFLICT (key) DO UPDATE SET points = 1, expire_at = $2
      `, [key, resetTime]);
      return { success: true, remaining: limit - 1, reset: resetTime };
    }

    const record = res.rows[0];
    const points = record.points;
    const expireAt = new Date(record.expire_at);

    if (points >= limit) {
      return { success: false, remaining: 0, reset: expireAt };
    }

    // Increment points
    await query(`
      UPDATE rate_limits
      SET points = points + 1
      WHERE key = $1
    `, [key]);

    return { success: true, remaining: limit - (points + 1), reset: expireAt };
  } catch (err) {
    // Fail-open: don't block legitimate users if DB has issues
    console.error(`Rate limit check failed for key ${key}:`, err);
    return { success: true, remaining: limit, reset: resetTime };
  }
}
