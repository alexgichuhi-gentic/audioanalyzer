import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedProfiles } from '@/lib/seed-profiles';
import { getDefaultUserId } from '@/lib/default-user';

export async function GET() {
  const userId = await getDefaultUserId();

  // Seed profiles on first request
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
