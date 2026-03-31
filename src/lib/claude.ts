import Groq from 'groq-sdk';
import { prisma } from './prisma';

let groqClient: Groq | null = null;

function getGroq() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
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
    const chatCompletion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: 'You are an expert call analyst. Analyze transcripts thoroughly and provide structured results. Always include a JSON code block with extracted metrics when the prompt asks for it.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const resultText = chatCompletion.choices[0]?.message?.content || '';
    const jsonData = extractJsonFromResponse(resultText);
    const tokensUsed =
      (chatCompletion.usage?.prompt_tokens || 0) +
      (chatCompletion.usage?.completion_tokens || 0);

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
