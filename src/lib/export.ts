import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export function generateAnalysisPdf(data: {
  filename: string;
  duration: string;
  language: string;
  date: string;
  profileName: string;
  transcript: string;
  analysis: string;
}): string {
  // Return HTML that can be printed to PDF client-side
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
        h1 { color: #4338ca; border-bottom: 2px solid #4338ca; padding-bottom: 8px; }
        h2 { color: #4338ca; margin-top: 24px; }
        h3 { color: #555; }
        .meta { color: #666; font-size: 14px; margin-bottom: 24px; background: #f8f8f8; padding: 12px; border-radius: 8px; }
        .meta span { display: inline-block; margin-right: 24px; }
        .transcript { background: #f5f5f5; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
        .analysis { margin-top: 24px; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
      </style>
    </head>
    <body>
      <h1>Analysis: ${data.filename}</h1>
      <div class="meta">
        <span><strong>Duration:</strong> ${data.duration}</span>
        <span><strong>Language:</strong> ${data.language}</span>
        <span><strong>Date:</strong> ${data.date}</span>
        <span><strong>Profile:</strong> ${data.profileName}</span>
      </div>
      <h2>Transcript</h2>
      <div class="transcript">${data.transcript}</div>
      <h2>Analysis</h2>
      <div class="analysis">${data.analysis}</div>
      <div class="footer">Generated on ${new Date().toLocaleString()}</div>
    </body>
    </html>
  `;
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
