import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const analyses = await prisma.analysis.findMany({
    where: { userId },
    include: { profile: true, transcript: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(analyses);
}
