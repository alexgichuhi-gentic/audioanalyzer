'use client';

import { useState } from 'react';
import { marked } from 'marked';
import { ChevronDown, ChevronUp, Trash2, Download, Code, FileText } from 'lucide-react';
import type { AnalysisData } from '@/types';

function BookingBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const styles: Record<string, string> = {
    booked: 'bg-green-100 text-green-700',
    tentative: 'bg-yellow-100 text-yellow-700',
    no_booking: 'bg-red-100 text-red-700',
    callback: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const styles: Record<string, string> = {
    interested: 'bg-green-100 text-green-700',
    satisfied: 'bg-green-100 text-green-700',
    neutral: 'bg-gray-100 text-gray-600',
    hesitant: 'bg-yellow-100 text-yellow-700',
    frustrated: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[sentiment] || 'bg-gray-100 text-gray-600'}`}>
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

export default function AnalysisView({
  analyses,
  metrics,
  onDelete,
}: {
  analyses: AnalysisData[];
  metrics: {
    bookingStatus: string | null;
    quotedAmount: number | null;
    customerName: string | null;
    customerSentiment: string | null;
    serviceType: string | null;
    appointmentDate: string | null;
  };
  onDelete: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    analyses.length > 0 ? analyses[0].id : null
  );
  const [jsonView, setJsonView] = useState<Record<string, boolean>>({});

  const handleExport = async (analysisId: string, format: 'pdf' | 'docx') => {
    const res = await fetch(`/api/analyses/${analysisId}/export?format=${format}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis.${format === 'pdf' ? 'html' : 'docx'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasMetrics =
    metrics.bookingStatus ||
    metrics.quotedAmount ||
    metrics.customerName ||
    metrics.serviceType;

  return (
    <div className="space-y-6">
      {hasMetrics && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Extracted Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Booking Status</p>
              <BookingBadge status={metrics.bookingStatus} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Quoted Amount</p>
              <p className="text-sm font-medium text-gray-900">
                {metrics.quotedAmount ? `$${metrics.quotedAmount.toLocaleString()}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Customer</p>
              <p className="text-sm font-medium text-gray-900">{metrics.customerName || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sentiment</p>
              <SentimentBadge sentiment={metrics.customerSentiment} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Service</p>
              <p className="text-sm font-medium text-gray-900">{metrics.serviceType || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Appointment</p>
              <p className="text-sm font-medium text-gray-900">{metrics.appointmentDate || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {analyses.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No analyses yet. Select a profile and run an analysis.
        </p>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{a.profile.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : a.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {a.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {a.tokensUsed > 0 && `${a.tokensUsed} tokens`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                  {expandedId === a.id ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedId === a.id && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="flex items-center gap-2 py-3">
                    <button
                      onClick={() => setJsonView((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      {jsonView[a.id] ? (
                        <>
                          <FileText className="h-3 w-3" /> Markdown
                        </>
                      ) : (
                        <>
                          <Code className="h-3 w-3" /> JSON
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleExport(a.id, 'pdf')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <Download className="h-3 w-3" /> PDF
                    </button>
                    <button
                      onClick={() => handleExport(a.id, 'docx')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <Download className="h-3 w-3" /> DOCX
                    </button>
                    <button
                      onClick={() => onDelete(a.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 ml-auto"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                  {jsonView[a.id] ? (
                    <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700 overflow-x-auto font-mono">
                      {JSON.stringify(JSON.parse(a.resultJson || '{}'), null, 2)}
                    </pre>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700"
                      dangerouslySetInnerHTML={{
                        __html: marked(a.resultMarkdown || '') as string,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
