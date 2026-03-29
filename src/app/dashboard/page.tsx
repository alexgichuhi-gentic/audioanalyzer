'use client';

import Navbar from '@/components/Navbar';
import DashboardCharts from '@/components/DashboardCharts';

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track your call performance and booking metrics
            </p>
          </div>
          <DashboardCharts />
        </div>
      </main>
    </>
  );
}
