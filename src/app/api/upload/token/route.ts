import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/x-wav',
          'audio/wave',
          'audio/mp4',
          'audio/x-m4a',
          'audio/m4a',
          'audio/ogg',
          'audio/flac',
          'audio/webm',
          'audio/aac',
          'audio/*',
          'application/octet-stream',
        ],
        // 500 MB cap — covers 60+ min audio comfortably
        maximumSizeInBytes: 500 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId }),
      }),
      onUploadCompleted: async () => {
        // No-op: we create the transcript record from /api/upload/complete
        // because we need the form metadata (project, comment, profileId).
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate upload token' },
      { status: 400 }
    );
  }
}
