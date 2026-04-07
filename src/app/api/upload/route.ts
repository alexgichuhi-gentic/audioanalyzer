import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import { transcribeAudio } from '@/lib/groq';

export const maxDuration = 300;

/**
 * Called by the client AFTER it has uploaded the file directly to Vercel Blob
 * via @vercel/blob/client `upload()`. This endpoint only receives the blob URL
 * + batch metadata, creates the Transcript row, and runs transcription.
 *
 * This avoids Vercel's 4.5 MB serverless body limit, so files of any size
 * (up to the 500 MB cap set in /api/upload/token) can be uploaded.
 */
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      blobUrl,
      filename,
      fileSize,
      batchId,
      comment,
      project,
      profileId,
    } = body as {
      blobUrl?: string;
      filename?: string;
      fileSize?: number;
      batchId?: string | null;
      comment?: string | null;
      project?: string | null;
      profileId?: string | null;
    };

    if (!blobUrl || !filename) {
      return NextResponse.json(
        { error: 'blobUrl and filename are required' },
        { status: 400 }
      );
    }

    const transcript = await prisma.transcript.create({
      data: {
        userId,
        filename,
        blobUrl,
        fileSize: fileSize ?? 0,
        status: 'processing',
        batchId: batchId || undefined,
        comment: comment || undefined,
        project: project || undefined,
      },
    });

    try {
      const result = await transcribeAudio(blobUrl, filename);
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

    return NextResponse.json({ transcriptId: transcript.id, profileId: profileId ?? null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Upload completion failed' },
      { status: 500 }
    );
  }
}
