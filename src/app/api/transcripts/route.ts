import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedProfiles } from '@/lib/seed-profiles';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await seedProfiles();

  const transcripts = await prisma.transcript.findMany({
    where: { userId },
    include: {
      analyses: {
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(transcripts);
}
