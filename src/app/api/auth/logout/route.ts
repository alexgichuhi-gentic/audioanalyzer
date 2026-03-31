import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookieName } from '@/lib/auth-helpers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
  return NextResponse.json({ success: true });
}
