import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from '@/lib/groq';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { transcriptId } = await req.json();

    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Mark as processing
    await prisma.transcript.update({
      where: { id: transcriptId },
      data: { status: 'processing' },
    });

    try {
      const result = await transcribeAudio(transcript.blobUrl, transcript.filename);

      await prisma.transcript.update({
        where: { id: transcriptId },
        data: {
          rawText: result.text,
          language: result.language,
          durationSeconds: result.duration,
          segmentsJson: JSON.stringify(result.segments),
          status: 'completed',
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      await prisma.transcript.update({
        where: { id: transcriptId },
        data: {
          status: 'failed',
          error: error.message || 'Transcription failed',
        },
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
