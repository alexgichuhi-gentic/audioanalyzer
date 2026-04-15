import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';
import {
  generateCombinedAnalysisPdf,
  generateCombinedAnalysisDocx,
  type AnalysisExportData,
  type CombinedExportMeta,
} from '@/lib/export';

export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { batchId } = await params;
  const format = req.nextUrl.searchParams.get('format') || 'pdf';

  // Fetch all transcripts in the batch (scoped to current user) with their
  // latest completed analysis.
  const transcripts = await prisma.transcript.findMany({
    where: { batchId, userId },
    orderBy: { createdAt: 'asc' },
    include: {
      analyses: {
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { profile: true },
      },
    },
  });

  if (transcripts.length === 0) {
    return NextResponse.json(
      { error: 'No transcripts found for this batch' },
      { status: 404 }
    );
  }

  const withAnalysis = transcripts.filter((t) => t.analyses.length > 0);

  if (withAnalysis.length === 0) {
    return NextResponse.json(
      {
        error:
          'No completed analyses in this batch yet. Analyses may still be processing — try again shortly.',
      },
      { status: 409 }
    );
  }

  const items: AnalysisExportData[] = withAnalysis.map((t) => {
    const analysis = t.analyses[0];
    return {
      filename: t.filename,
      duration: `${Math.floor(t.durationSeconds / 60)}m ${Math.round(
        t.durationSeconds % 60
      )}s`,
      language: t.language,
      date: t.createdAt.toISOString().split('T')[0],
      profileName: analysis.profile.name,
      transcript: t.rawText,
      analysis: analysis.resultMarkdown,
    };
  });

  const firstProject = transcripts.find((t) => t.project)?.project || null;
  const firstComment = transcripts.find((t) => t.comment)?.comment || null;
  const batchLabel =
    firstProject ||
    `Batch ${transcripts[0].createdAt.toISOString().split('T')[0]}`;

  const meta: CombinedExportMeta = {
    batchLabel,
    project: firstProject,
    comment: firstComment,
    itemCount: items.length,
  };

  // Filename-safe slug
  const slug = (firstProject || 'batch')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'batch';

  if (format === 'docx') {
    const buffer = await generateCombinedAnalysisDocx(meta, items);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${slug}-combined-analysis.docx"`,
      },
    });
  }

  const pdfBuffer = generateCombinedAnalysisPdf(meta, items);
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${slug}-combined-analysis.pdf"`,
    },
  });
}
