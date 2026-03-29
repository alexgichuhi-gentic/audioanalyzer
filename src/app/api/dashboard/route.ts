import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDefaultUserId } from '@/lib/default-user';

function getWeekLabel(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${month} ${date.getDate()}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const userId = await getDefaultUserId();

  const transcripts = await prisma.transcript.findMany({
    where: { userId, status: 'completed' },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalCalls = transcripts.length;
  const totalThisMonth = transcripts.filter((t) => t.createdAt >= monthStart).length;

  const withBooking = transcripts.filter((t) => t.bookingStatus);
  const booked = withBooking.filter((t) => t.bookingStatus === 'booked').length;
  const bookingRate = withBooking.length > 0 ? (booked / withBooking.length) * 100 : 0;

  const averageDuration =
    transcripts.length > 0
      ? transcripts.reduce((sum, t) => sum + t.durationSeconds, 0) / transcripts.length
      : 0;

  const totalQuotedAmount = transcripts.reduce((sum, t) => sum + (t.quotedAmount || 0), 0);

  const sentimentScores: Record<string, number> = {
    interested: 5,
    satisfied: 4,
    neutral: 3,
    hesitant: 2,
    frustrated: 1,
  };
  const withSentiment = transcripts.filter((t) => t.customerSentiment);
  const averageSentimentScore =
    withSentiment.length > 0
      ? withSentiment.reduce(
          (sum, t) => sum + (sentimentScores[t.customerSentiment || ''] || 3),
          0
        ) / withSentiment.length
      : 3;

  // Generate last 12 weeks
  const weeks: { start: Date; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const start = getWeekStart(d);
    weeks.push({ start, label: getWeekLabel(start) });
  }

  const callVolumeByWeek = weeks.map((w) => {
    const weekEnd = new Date(w.start);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const calls = transcripts.filter(
      (t) => t.createdAt >= w.start && t.createdAt < weekEnd
    ).length;
    return { week: w.label, calls };
  });

  const conversionByWeek = weeks.map((w) => {
    const weekEnd = new Date(w.start);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekTranscripts = transcripts.filter(
      (t) => t.createdAt >= w.start && t.createdAt < weekEnd && t.bookingStatus
    );
    const weekBooked = weekTranscripts.filter((t) => t.bookingStatus === 'booked').length;
    const total = weekTranscripts.length;
    return {
      week: w.label,
      booked: weekBooked,
      total,
      rate: total > 0 ? Math.round((weekBooked / total) * 1000) / 10 : 0,
    };
  });

  // Sentiment distribution
  const sentimentCounts: Record<string, number> = {};
  transcripts.forEach((t) => {
    if (t.customerSentiment) {
      sentimentCounts[t.customerSentiment] = (sentimentCounts[t.customerSentiment] || 0) + 1;
    }
  });
  const sentimentDistribution = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
    sentiment,
    count,
  }));

  // Booking status breakdown
  const bookingCounts: Record<string, number> = {};
  transcripts.forEach((t) => {
    if (t.bookingStatus) {
      bookingCounts[t.bookingStatus] = (bookingCounts[t.bookingStatus] || 0) + 1;
    }
  });
  const bookingStatusBreakdown = Object.entries(bookingCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Quotes over time
  const quotesOverTime = weeks.map((w) => {
    const weekEnd = new Date(w.start);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekTranscripts = transcripts.filter(
      (t) => t.createdAt >= w.start && t.createdAt < weekEnd && t.quotedAmount
    );
    const totalQuoted = weekTranscripts.reduce((sum, t) => sum + (t.quotedAmount || 0), 0);
    return {
      week: w.label,
      totalQuoted,
      averageQuote: weekTranscripts.length > 0 ? Math.round(totalQuoted / weekTranscripts.length) : 0,
    };
  });

  // Top services
  const serviceCounts: Record<string, number> = {};
  transcripts.forEach((t) => {
    if (t.serviceType) {
      serviceCounts[t.serviceType] = (serviceCounts[t.serviceType] || 0) + 1;
    }
  });
  const topServices = Object.entries(serviceCounts)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Recent conversions
  const recentConversions = transcripts
    .filter((t) => t.bookingStatus === 'booked')
    .slice(0, 10)
    .map((t) => ({
      filename: t.filename,
      customerName: t.customerName || '',
      amount: t.quotedAmount || 0,
      date: t.createdAt.toISOString(),
    }));

  return NextResponse.json({
    totalCalls,
    totalThisMonth,
    bookingRate,
    averageDuration,
    totalQuotedAmount,
    averageSentimentScore,
    callVolumeByWeek,
    conversionByWeek,
    sentimentDistribution,
    bookingStatusBreakdown,
    quotesOverTime,
    topServices,
    recentConversions,
  });
}
