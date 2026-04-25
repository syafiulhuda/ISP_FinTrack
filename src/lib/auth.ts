import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'fintrack_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function createSession(adminId: number) {
  const token = crypto.randomUUID();
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, `${adminId}:${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!session?.value) return null;
  
  const [adminId] = session.value.split(':');
  const id = parseInt(adminId);
  
  return isNaN(id) ? null : id;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
