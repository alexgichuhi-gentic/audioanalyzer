import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SESSION_COOKIE = 'audio-analyzer-session';

export async function createSession(userId: string): Promise<string> {
  // Simple base64-encoded token with timestamp
  const token = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64');
  return token;
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;

  try {
    const decoded = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    // Verify user still exists
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return null;
    return user.id;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  return userId;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
