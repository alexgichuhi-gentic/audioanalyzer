import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/claude';
import { getDefaultUserId } from '@/lib/default-user';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await getDefaultUserId();

  try {
    const { transcriptId, profileId } = await req.json();

    if (!transcriptId || !profileId) {
      return NextResponse.json({ error: 'transcriptId and profileId are required' }, { status: 400 });
    }

    const analysisId = await analyzeTranscript(transcriptId, profileId, userId);

    return NextResponse.json({ analysisId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
