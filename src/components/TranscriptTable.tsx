'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Eye,
  Trash2,
  FileText,
  FileDown,
  ChevronDown,
  Loader2,
  Copy,
  X,
  Download,
} from 'lucide-react';
import type { TranscriptWithAnalyses, ProfileData } from '@/types';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function BookingBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">-</span>;
  const styles: Record<string, string> = {
    booked: 'bg-green-100 text-green-700',
    tentative: 'bg-yellow-100 text-yellow-700',
    no_booking: 'bg-red-100 text-red-700',
    callback: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TranscriptTable({ refreshKey }: { refreshKey: number }) {
  const [transcripts, setTranscripts] = useState<TranscriptWithAnalyses[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewText, setViewText] = useState<string | null>(null);
  const [analyzingMap, setAnalyzingMap] = useState<Record<string, boolean>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch('/api/transcripts'),
        fetch('/api/profiles'),
      ]);
      const tData = await tRes.json();
      const pData = await pRes.json();
      setTranscripts(Array.isArray(tData) ? tData : []);
      setProfiles(Array.isArray(pData) ? pData : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const handleAnalyze = async (transcriptId: string, profileId: string) => {
    setOpenDropdown(null);
    setAnalyzingMap((prev) => ({ ...prev, [transcriptId]: true }));

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptId, profileId }),
      });
      if (!res.ok) throw new Error('Failed');
      const { analysisId } = await res.json();

      // Poll for completion
      const poll = setInterval(async () => {
        const aRes = await fetch(`/api/analyses/${analysisId}`);
        const aData = await aRes.json();
        if (aData.status === 'completed' || aData.status === 'failed') {
          clearInterval(poll);
          setAnalyzingMap((prev) => ({ ...prev, [transcriptId]: false }));
          fetchData();
        }
      }, 3000);
    } catch {
      setAnalyzingMap((prev) => ({ ...prev, [transcriptId]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transcript and all its analyses?')) return;
    await fetch(`/api/transcripts/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleExport = async (analysisId: string, format: 'pdf' | 'docx') => {
    const res = await fetch(`/api/analyses/${analysisId}/export?format=${format}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (transcripts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No transcripts yet. Upload an audio file to get started.</p>
      </div>
    );
  }

  return (
    <>
      {/* Transcript text modal */}
      {viewText !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Transcript</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(viewText);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewText(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {viewText}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 font-medium text-gray-500">Filename</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Duration</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Lang</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Booking</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Date</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Transcript</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Analyze</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Export</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transcripts.map((t) => {
              const latestAnalysis = t.analyses?.[0];
              return (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-900 max-w-[180px] truncate">
                    {t.filename}
                  </td>
                  <td className="py-3 px-3 text-gray-600">
                    {t.durationSeconds > 0 ? formatDuration(t.durationSeconds) : '-'}
                  </td>
                  <td className="py-3 px-3 text-gray-600 uppercase">{t.language}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-3 px-3">
                    <BookingBadge status={t.bookingStatus} />
                  </td>
                  <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3">
                    {t.status === 'completed' && t.rawText ? (
                      <button
                        onClick={() => setViewText(t.rawText)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        View Text
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {t.status === 'completed' ? (
                      <div className="relative">
                        {analyzingMap[t.id] ? (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing...
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                setOpenDropdown(openDropdown === t.id ? null : t.id)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100"
                            >
                              Analyze <ChevronDown className="h-3 w-3" />
                            </button>
                            {openDropdown === t.id && (
                              <div className="absolute z-10 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1">
                                {profiles.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleAnalyze(t.id, p.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    {p.name}
                                    {p.isDefault && (
                                      <span className="ml-2 text-xs text-indigo-500">(default)</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {latestAnalysis && latestAnalysis.status === 'completed' ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExport(latestAnalysis.id, 'pdf')}
                          className="text-xs text-gray-600 hover:text-indigo-600 font-medium"
                          title="Export PDF"
                        >
                          PDF
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleExport(latestAnalysis.id, 'docx')}
                          className="text-xs text-gray-600 hover:text-indigo-600 font-medium"
                          title="Export DOCX"
                        >
                          DOCX
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/transcript/${t.id}`}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
