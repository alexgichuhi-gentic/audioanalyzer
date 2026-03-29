import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDefaultUserId } from '@/lib/default-user';

export async function GET() {
  const userId = await getDefaultUserId();

  const analyses = await prisma.analysis.findMany({
    where: { userId },
    include: { profile: true, transcript: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(analyses);
}
