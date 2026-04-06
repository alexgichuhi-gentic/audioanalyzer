export interface TranscriptWithAnalyses {
  id: string;
  userId: string;
  filename: string;
  blobUrl: string;
  fileSize: number;
  durationSeconds: number;
  language: string;
  rawText: string;
  segmentsJson: string;
  status: string;
  error: string;
  batchId: string | null;
  comment: string | null;
  project: string | null;
  createdAt: string;
  completedAt: string | null;
  bookingStatus: string | null;
  quotedAmount: number | null;
  customerName: string | null;
  customerSentiment: string | null;
  serviceType: string | null;
  appointmentDate: string | null;
  analyses: AnalysisData[];
}

export interface AnalysisData {
  id: string;
  transcriptId: string;
  profileId: string;
  userId: string;
  promptSent: string;
  resultMarkdown: string;
  resultJson: string;
  status: string;
  error: string;
  tokensUsed: number;
  createdAt: string;
  completedAt: string | null;
  profile: ProfileData;
}

export interface ProfileData {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalCalls: number;
  totalThisMonth: number;
  bookingRate: number;
  averageDuration: number;
  totalQuotedAmount: number;
  averageSentimentScore: number;
  callVolumeByWeek: { week: string; calls: number }[];
  conversionByWeek: { week: string; booked: number; total: number; rate: number }[];
  sentimentDistribution: { sentiment: string; count: number }[];
  bookingStatusBreakdown: { status: string; count: number }[];
  quotesOverTime: { week: string; totalQuoted: number; averageQuote: number }[];
  topServices: { service: string; count: number }[];
  recentConversions: {
    filename: string;
    customerName: string;
    amount: number;
    date: string;
  }[];
}
