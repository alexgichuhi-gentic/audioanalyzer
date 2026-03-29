import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const transcript = await prisma.transcript.findUnique({
    where: { id },
    include: {
      analyses: {
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!transcript) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(transcript);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const transcript = await prisma.transcript.findUnique({ where: { id } });
  if (!transcript) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.transcript.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
