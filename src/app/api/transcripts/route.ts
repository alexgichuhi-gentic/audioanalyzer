import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { seedProfiles } from '@/lib/seed-profiles';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Seed profiles on first request
  await seedProfiles();

  const transcripts = await prisma.transcript.findMany({
    where: { userId: session.user.id },
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
