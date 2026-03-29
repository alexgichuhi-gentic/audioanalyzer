'use client';

import AuthGuard from '@/components/AuthGuard';
import ProfileEditor from '@/components/ProfileEditor';

export default function ProfilesPage() {
  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analysis Profiles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage prompt templates for analyzing transcripts
          </p>
        </div>
        <ProfileEditor />
      </div>
    </AuthGuard>
  );
}
