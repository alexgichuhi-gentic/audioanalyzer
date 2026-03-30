import Groq from 'groq-sdk';

let groq: Groq | null = null;

function getGroq() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

export async function transcribeAudio(audioUrl: string, filename: string) {
  const response = await fetch(audioUrl);
  const audioBuffer = await response.arrayBuffer();

  const file = new File([audioBuffer], filename, { type: 'audio/mpeg' });

  const transcription = await getGroq().audio.transcriptions.create({
    file: file,
    model: 'whisper-large-v3-turbo',
    response_format: 'verbose_json',
    language: 'en',
  });

  return {
    text: transcription.text,
    language: (transcription as any).language || 'en',
    duration: (transcription as any).duration || 0,
    segments: (transcription as any).segments || [],
  };
}
