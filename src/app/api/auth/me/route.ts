import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user });
}
