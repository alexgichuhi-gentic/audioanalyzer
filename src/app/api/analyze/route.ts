import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/claude';
import { requireAuth } from '@/lib/auth-helpers';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
