import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { transcribeAudio } from '@/lib/groq';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const batchId = formData.get('batchId') as string | null;
    const comment = formData.get('comment') as string | null;
    const profileId = formData.get('profileId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    const transcript = await prisma.transcript.create({
      data: {
        userId,
        filename: file.name,
        blobUrl: blob.url,
        fileSize: file.size,
        status: 'processing',
        batchId: batchId || undefined,
        comment: comment || undefined,
      },
    });

    try {
      const result = await transcribeAudio(blob.url, file.name);
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: {
          rawText: result.text,
          language: result.language,
          durationSeconds: result.duration,
          segmentsJson: JSON.stringify(result.segments),
          status: 'completed',
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: {
          status: 'failed',
          error: err.message || 'Transcription failed',
        },
      });
    }

    return NextResponse.json({ transcriptId: transcript.id, profileId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
