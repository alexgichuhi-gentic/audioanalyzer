import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { getDefaultUserId } from '@/lib/default-user';
import { transcribeAudio } from '@/lib/groq';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await getDefaultUserId();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Create transcript record
    const transcript = await prisma.transcript.create({
      data: {
        userId,
        filename: file.name,
        blobUrl: blob.url,
        fileSize: file.size,
        status: 'processing',
      },
    });

    // Transcribe inline — no separate background request
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

    return NextResponse.json({ transcriptId: transcript.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
