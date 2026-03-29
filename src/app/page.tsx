'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import UploadZone from '@/components/UploadZone';
import TranscriptTable from '@/components/TranscriptTable';

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload & Transcribe</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload audio files to transcribe and analyze with AI
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <UploadZone onUploadComplete={() => setRefreshKey((k) => k + 1)} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transcripts</h2>
          <TranscriptTable refreshKey={refreshKey} />
        </div>
      </div>
    </AuthGuard>
  );
}
