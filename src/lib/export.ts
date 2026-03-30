import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import jsPDF from 'jspdf';

export function generateAnalysisPdf(data: {
  filename: string;
  duration: string;
  language: string;
  date: string;
  profileName: string;
  transcript: string;
  analysis: string;
}): Buffer {
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

export async function generateAnalysisDocx(data: {
  filename: string;
  duration: string;
  language: string;
  date: string;
  profileName: string;
  transcript: string;
  analysis: string;
}): Promise<Buffer> {
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
