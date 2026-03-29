import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAnalysisPdf, generateAnalysisDocx } from '@/lib/export';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get('format') || 'pdf';

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: { profile: true, transcript: true },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = {
    filename: analysis.transcript.filename,
    duration: `${Math.floor(analysis.transcript.durationSeconds / 60)}m ${Math.round(
      analysis.transcript.durationSeconds % 60
    )}s`,
    language: analysis.transcript.language,
    date: analysis.transcript.createdAt.toISOString().split('T')[0],
    profileName: analysis.profile.name,
    transcript: analysis.transcript.rawText,
    analysis: analysis.resultMarkdown,
  };

  if (format === 'docx') {
    const buffer = await generateAnalysisDocx(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="analysis-${id}.docx"`,
      },
    });
  }

  // PDF (HTML)
  const html = generateAnalysisPdf(data);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="analysis-${id}.html"`,
    },
  });
}
