'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AnalysisView from '@/components/AnalysisView';
import { Loader2, Copy, ArrowLeft } from 'lucide-react';
import type { TranscriptWithAnalyses, ProfileData } from '@/types';

export default function TranscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [transcript, setTranscript] = useState<TranscriptWithAnalyses | null>(null);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'transcript' | 'analysis'>('transcript');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/transcripts/${id}`),
        fetch('/api/profiles'),
      ]);
      const tData = await tRes.json();
      const pData = await pRes.json();
      setTranscript(tData);
      setProfiles(Array.isArray(pData) ? pData : []);
      if (!selectedProfileId && Array.isArray(pData) && pData.length > 0) {
        const defaultProfile = pData.find((p: ProfileData) => p.isDefault) || pData[0];
        setSelectedProfileId(defaultProfile.id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAnalyze = async () => {
    if (!selectedProfileId) return;
    setAnalyzing(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptId: id, profileId: selectedProfileId }),
      });
      const { analysisId } = await res.json();

      const poll = setInterval(async () => {
        const aRes = await fetch(`/api/analyses/${analysisId}`);
        const aData = await aRes.json();
        if (aData.status === 'completed' || aData.status === 'failed') {
          clearInterval(poll);
          setAnalyzing(false);
          fetchData();
        }
      }, 3000);
    } catch {
      setAnalyzing(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    if (!confirm('Delete this analysis?')) return;
    await fetch(`/api/analyses/${analysisId}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to transcripts
          </button>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          ) : !transcript ? (
            <p className="text-center text-gray-500 py-12">Transcript not found.</p>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{transcript.filename}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>
                    Duration:{' '}
                    {transcript.durationSeconds > 0
                      ? `${Math.floor(transcript.durationSeconds / 60)}:${Math.round(transcript.durationSeconds % 60).toString().padStart(2, '0')}`
                      : '-'}
                  </span>
                  <span>Language: {transcript.language.toUpperCase()}</span>
                  <span>Date: {new Date(transcript.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-gray-200 mb-6">
                <button
                  onClick={() => setTab('transcript')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'transcript'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Transcript
                </button>
                <button
                  onClick={() => setTab('analysis')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'analysis'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Analysis ({transcript.analyses?.length || 0})
                </button>
              </div>

              {tab === 'transcript' ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">Full Transcript</h2>
                    <button
                      onClick={() => navigator.clipboard.writeText(transcript.rawText)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {transcript.rawText || 'No transcript text available.'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Run analysis controls */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedProfileId}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.isDefault ? '(default)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing || !selectedProfileId}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
                        Run Analysis
                      </button>
                    </div>
                  </div>

                  <AnalysisView
                    analyses={transcript.analyses || []}
                    metrics={{
                      bookingStatus: transcript.bookingStatus,
                      quotedAmount: transcript.quotedAmount,
                      customerName: transcript.customerName,
                      customerSentiment: transcript.customerSentiment,
                      serviceType: transcript.serviceType,
                      appointmentDate: transcript.appointmentDate,
                    }}
                    onDelete={handleDeleteAnalysis}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
