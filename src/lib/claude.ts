import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';

let anthropic: Anthropic | null = null;

function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

function extractJsonFromResponse(text: string): any {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      return {};
    }
  }
  return {};
}

function extractMetrics(jsonData: any) {
  return {
    bookingStatus: jsonData.booking_status || null,
    quotedAmount: parseFloat(jsonData.price_mentioned) || null,
    customerName: jsonData.customer_name || null,
    customerSentiment: jsonData.customer_sentiment || null,
    serviceType: jsonData.service_type || null,
    appointmentDate: jsonData.appointment_date || null,
  };
}

export async function analyzeTranscript(
  transcriptId: string,
  profileId: string,
  userId: string
) {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
  });

  if (!transcript) throw new Error('Transcript not found');

  const profile = await prisma.analysisProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) throw new Error('Profile not found');

  const variables = {
    transcript: transcript.rawText,
    language: transcript.language,
    duration: `${Math.round(transcript.durationSeconds / 60)}m ${Math.round(transcript.durationSeconds % 60)}s`,
    date: transcript.createdAt.toISOString().split('T')[0],
  };

  const prompt = renderTemplate(profile.promptTemplate, variables);

  const analysis = await prisma.analysis.create({
    data: {
      transcriptId,
      profileId,
      userId,
      promptSent: prompt,
      status: 'processing',
    },
  });

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const resultText =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonData = extractJsonFromResponse(resultText);
    const tokensUsed =
      (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        resultMarkdown: resultText,
        resultJson: JSON.stringify(jsonData),
        status: 'completed',
        tokensUsed,
        completedAt: new Date(),
      },
    });

    // Update transcript with extracted metrics
    const metrics = extractMetrics(jsonData);
    await prisma.transcript.update({
      where: { id: transcriptId },
      data: metrics,
    });

    return analysis.id;
  } catch (error: any) {
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: 'failed',
        error: error.message || 'Analysis failed',
      },
    });
    throw error;
  }
}
