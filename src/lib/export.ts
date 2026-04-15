import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import jsPDF from 'jspdf';

export interface AnalysisExportData {
  filename: string;
  duration: string;
  language: string;
  date: string;
  profileName: string;
  transcript: string;
  analysis: string;
}

export function generateAnalysisPdf(data: AnalysisExportData): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 15;
    }
  };

  const addWrappedText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [51, 51, 51]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      checkPage(fontSize * 0.5);
      doc.text(line, margin, y);
      y += fontSize * 0.45;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text(`Analysis: ${data.filename}`, margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(67, 56, 202);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Meta
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y - 2, maxWidth, 14, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Duration: ${data.duration}   |   Language: ${data.language}   |   Date: ${data.date}   |   Profile: ${data.profileName}`, margin + 4, y + 6);
  y += 20;

  // Transcript section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text('Transcript', margin, y);
  y += 8;

  // Transcript content
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.setTextColor(80, 80, 80);
  const transcriptLines = doc.splitTextToSize(data.transcript || 'No transcript available.', maxWidth - 8);
  for (const line of transcriptLines) {
    checkPage(4);
    doc.text(line, margin + 4, y);
    y += 3.5;
  }
  y += 8;

  // Analysis section
  checkPage(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text('Analysis', margin, y);
  y += 8;

  // Parse analysis markdown
  const analysisLines = (data.analysis || 'No analysis available.').split('\n');
  for (const line of analysisLines) {
    if (line.startsWith('### ')) {
      y += 3;
      checkPage(8);
      addWrappedText(line.replace('### ', ''), 11, true, [85, 85, 85]);
      y += 2;
    } else if (line.startsWith('## ')) {
      y += 4;
      checkPage(10);
      addWrappedText(line.replace('## ', ''), 13, true, [67, 56, 202]);
      y += 2;
    } else if (line.startsWith('# ')) {
      y += 4;
      checkPage(12);
      addWrappedText(line.replace('# ', ''), 15, true, [67, 56, 202]);
      y += 2;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      checkPage(5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text('\u2022', margin + 2, y);
      const bulletLines = doc.splitTextToSize(line.replace(/^[-*] /, ''), maxWidth - 10);
      for (const bl of bulletLines) {
        doc.text(bl, margin + 7, y);
        y += 4;
      }
    } else if (line.trim() === '') {
      y += 3;
    } else {
      // Handle bold markers
      const cleanLine = line.replace(/\*\*/g, '');
      const hasBold = line.includes('**');
      addWrappedText(cleanLine, 9, hasBold);
    }
  }

  // Footer
  y += 10;
  checkPage(10);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y);

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateAnalysisDocx(data: AnalysisExportData): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `Analysis: ${data.filename}`,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Duration: ${data.duration}  |  `, color: '666666', size: 22 }),
              new TextRun({ text: `Language: ${data.language}  |  `, color: '666666', size: 22 }),
              new TextRun({ text: `Date: ${data.date}  |  `, color: '666666', size: 22 }),
              new TextRun({ text: `Profile: ${data.profileName}`, color: '666666', size: 22 }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'Transcript',
            heading: HeadingLevel.HEADING_1,
          }),
          ...data.transcript.split('\n').map(
            (line) =>
              new Paragraph({
                children: [new TextRun({ text: line, font: 'Courier New', size: 20 })],
              })
          ),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'Analysis',
            heading: HeadingLevel.HEADING_1,
          }),
          ...data.analysis.split('\n').map((line) => {
            if (line.startsWith('### ')) {
              return new Paragraph({
                text: line.replace('### ', ''),
                heading: HeadingLevel.HEADING_3,
              });
            }
            if (line.startsWith('## ')) {
              return new Paragraph({
                text: line.replace('## ', ''),
                heading: HeadingLevel.HEADING_2,
              });
            }
            if (line.startsWith('- ')) {
              return new Paragraph({
                children: [new TextRun({ text: line, font: 'Calibri', size: 22 })],
                bullet: { level: 0 },
              });
            }
            if (line.startsWith('**') && line.endsWith('**')) {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: line.replace(/\*\*/g, ''),
                    bold: true,
                    font: 'Calibri',
                    size: 22,
                  }),
                ],
              });
            }
            return new Paragraph({
              children: [new TextRun({ text: line, font: 'Calibri', size: 22 })],
            });
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Generated on ${new Date().toLocaleString()}`,
                color: '999999',
                size: 18,
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// Combined (batch) exports — stitch multiple analyses into a single document
// ---------------------------------------------------------------------------

export interface CombinedExportMeta {
  batchLabel: string; // e.g. project name or "Batch 2026-04-15"
  project: string | null;
  comment: string | null;
  itemCount: number;
}

export function generateCombinedAnalysisPdf(
  meta: CombinedExportMeta,
  items: AnalysisExportData[]
): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
  };

  const addWrappedText = (
    text: string,
    fontSize: number,
    isBold: boolean = false,
    color: [number, number, number] = [51, 51, 51],
    indent: number = 0
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    for (const line of lines) {
      checkPage(fontSize * 0.5);
      doc.text(line, margin + indent, y);
      y += fontSize * 0.45;
    }
  };

  // --- Cover page ---
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text('Combined Analysis Report', margin, y);
  y += 12;

  doc.setDrawColor(67, 56, 202);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(meta.batchLabel, margin, y);
  y += 8;

  if (meta.project) {
    addWrappedText(`Project: ${meta.project}`, 10, false, [100, 100, 100]);
    y += 1;
  }
  if (meta.comment) {
    addWrappedText(`Description: ${meta.comment}`, 10, false, [100, 100, 100]);
    y += 1;
  }
  addWrappedText(`Files included: ${meta.itemCount}`, 10, false, [100, 100, 100]);
  addWrappedText(`Generated: ${new Date().toLocaleString()}`, 10, false, [100, 100, 100]);
  y += 8;

  // Table of contents
  checkPage(14);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text('Contents', margin, y);
  y += 8;

  items.forEach((item, idx) => {
    checkPage(6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    const label = `${idx + 1}. ${item.filename}`;
    const lines = doc.splitTextToSize(label, maxWidth);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin, y);
      y += 5;
    }
  });

  // --- Per-item sections ---
  items.forEach((item, idx) => {
    doc.addPage();
    y = 15;

    // Section header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text(`FILE ${idx + 1} OF ${items.length}`, margin, y);
    y += 6;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(67, 56, 202);
    const titleLines = doc.splitTextToSize(item.filename, maxWidth);
    for (const line of titleLines) {
      checkPage(8);
      doc.text(line, margin, y);
      y += 7;
    }

    doc.setDrawColor(67, 56, 202);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Meta strip
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, y - 2, maxWidth, 12, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Duration: ${item.duration}   |   Language: ${item.language}   |   Date: ${item.date}   |   Profile: ${item.profileName}`,
      margin + 4,
      y + 5
    );
    y += 16;

    // Transcript
    checkPage(12);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(67, 56, 202);
    doc.text('Transcript', margin, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.setTextColor(80, 80, 80);
    const transcriptLines = doc.splitTextToSize(
      item.transcript || 'No transcript available.',
      maxWidth - 8
    );
    for (const line of transcriptLines) {
      checkPage(4);
      doc.text(line, margin + 4, y);
      y += 3.5;
    }
    y += 6;

    // Analysis
    checkPage(14);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(67, 56, 202);
    doc.text('Analysis', margin, y);
    y += 7;

    const analysisLines = (item.analysis || 'No analysis available.').split('\n');
    for (const line of analysisLines) {
      if (line.startsWith('### ')) {
        y += 3;
        checkPage(8);
        addWrappedText(line.replace('### ', ''), 11, true, [85, 85, 85]);
        y += 2;
      } else if (line.startsWith('## ')) {
        y += 4;
        checkPage(10);
        addWrappedText(line.replace('## ', ''), 13, true, [67, 56, 202]);
        y += 2;
      } else if (line.startsWith('# ')) {
        y += 4;
        checkPage(12);
        addWrappedText(line.replace('# ', ''), 15, true, [67, 56, 202]);
        y += 2;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        checkPage(5);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 51, 51);
        doc.text('\u2022', margin + 2, y);
        const bulletLines = doc.splitTextToSize(
          line.replace(/^[-*] /, ''),
          maxWidth - 10
        );
        for (const bl of bulletLines) {
          doc.text(bl, margin + 7, y);
          y += 4;
        }
      } else if (line.trim() === '') {
        y += 3;
      } else {
        const cleanLine = line.replace(/\*\*/g, '');
        const hasBold = line.includes('**');
        addWrappedText(cleanLine, 9, hasBold);
      }
    }
  });

  // Final footer on last page
  checkPage(12);
  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Combined report generated on ${new Date().toLocaleString()}`,
    margin,
    y
  );

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateCombinedAnalysisDocx(
  meta: CombinedExportMeta,
  items: AnalysisExportData[]
): Promise<Buffer> {
  const coverChildren: Paragraph[] = [
    new Paragraph({ text: 'Combined Analysis Report', heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [new TextRun({ text: meta.batchLabel, size: 28, color: '333333' })],
    }),
    new Paragraph({ text: '' }),
  ];

  if (meta.project) {
    coverChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `Project: ${meta.project}`, color: '666666', size: 22 })],
      })
    );
  }
  if (meta.comment) {
    coverChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Description: ${meta.comment}`, color: '666666', size: 22 }),
        ],
      })
    );
  }
  coverChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Files included: ${meta.itemCount}`, color: '666666', size: 22 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleString()}`,
          color: '666666',
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({ text: 'Contents', heading: HeadingLevel.HEADING_2 })
  );

  items.forEach((item, idx) => {
    coverChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. ${item.filename}`, size: 22, color: '333333' }),
        ],
      })
    );
  });

  const sectionChildren: Paragraph[] = [];

  items.forEach((item, idx) => {
    sectionChildren.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        children: [
          new TextRun({
            text: `FILE ${idx + 1} OF ${items.length}`,
            bold: true,
            size: 18,
            color: '888888',
          }),
        ],
      }),
      new Paragraph({ text: item.filename, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        children: [
          new TextRun({ text: `Duration: ${item.duration}  |  `, color: '666666', size: 22 }),
          new TextRun({ text: `Language: ${item.language}  |  `, color: '666666', size: 22 }),
          new TextRun({ text: `Date: ${item.date}  |  `, color: '666666', size: 22 }),
          new TextRun({ text: `Profile: ${item.profileName}`, color: '666666', size: 22 }),
        ],
      }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'Transcript', heading: HeadingLevel.HEADING_2 })
    );

    item.transcript.split('\n').forEach((line) => {
      sectionChildren.push(
        new Paragraph({
          children: [new TextRun({ text: line, font: 'Courier New', size: 20 })],
        })
      );
    });

    sectionChildren.push(
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'Analysis', heading: HeadingLevel.HEADING_2 })
    );

    item.analysis.split('\n').forEach((line) => {
      if (line.startsWith('### ')) {
        sectionChildren.push(
          new Paragraph({ text: line.replace('### ', ''), heading: HeadingLevel.HEADING_3 })
        );
      } else if (line.startsWith('## ')) {
        sectionChildren.push(
          new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_2 })
        );
      } else if (line.startsWith('- ')) {
        sectionChildren.push(
          new Paragraph({
            children: [new TextRun({ text: line.replace(/^- /, ''), font: 'Calibri', size: 22 })],
            bullet: { level: 0 },
          })
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        sectionChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.replace(/\*\*/g, ''),
                bold: true,
                font: 'Calibri',
                size: 22,
              }),
            ],
          })
        );
      } else {
        sectionChildren.push(
          new Paragraph({
            children: [new TextRun({ text: line, font: 'Calibri', size: 22 })],
          })
        );
      }
    });
  });

  const footerChildren: Paragraph[] = [
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `Combined report generated on ${new Date().toLocaleString()}`,
          color: '999999',
          size: 18,
          italics: true,
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...coverChildren, ...sectionChildren, ...footerChildren],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
