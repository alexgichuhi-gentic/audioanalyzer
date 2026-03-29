import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // Create transcript record
    const transcript = await prisma.transcript.create({
      data: {
        userId: session.user.id,
        filename: file.name,
        blobUrl: blob.url,
        fileSize: file.size,
        status: 'pending',
      },
    });

    // Trigger transcription in background (fire and forget)
    const baseUrl = req.nextUrl.origin;
    fetch(`${baseUrl}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptId: transcript.id }),
    }).catch(() => {});

    return NextResponse.json({ transcriptId: transcript.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
