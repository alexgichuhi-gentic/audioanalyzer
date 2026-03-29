import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeTranscript } from '@/lib/claude';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { transcriptId, profileId } = await req.json();

    if (!transcriptId || !profileId) {
      return NextResponse.json({ error: 'transcriptId and profileId are required' }, { status: 400 });
    }

    const analysisId = await analyzeTranscript(transcriptId, profileId, session.user.id);

    return NextResponse.json({ analysisId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
