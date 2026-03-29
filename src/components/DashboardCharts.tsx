'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2, PhoneCall, Calendar, TrendingUp, Clock, DollarSign, Smile } from 'lucide-react';
import type { DashboardStats } from '@/types';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];
const BOOKING_COLORS: Record<string, string> = {
  booked: '#10b981',
  tentative: '#f59e0b',
  no_booking: '#ef4444',
  callback: '#3b82f6',
};
const SENTIMENT_COLORS: Record<string, string> = {
  interested: '#10b981',
  satisfied: '#10b981',
  neutral: '#9ca3af',
  hesitant: '#f59e0b',
  frustrated: '#ef4444',
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Icon className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardCharts() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center text-gray-500 py-12">Failed to load dashboard data.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={PhoneCall} label="Total Calls" value={stats.totalCalls.toString()} />
        <StatCard icon={Calendar} label="This Month" value={stats.totalThisMonth.toString()} />
        <StatCard icon={TrendingUp} label="Booking Rate" value={`${stats.bookingRate.toFixed(1)}%`} />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={`${Math.floor(stats.averageDuration / 60)}:${Math.round(stats.averageDuration % 60)
            .toString()
            .padStart(2, '0')}`}
        />
        <StatCard icon={DollarSign} label="Total Quoted" value={`$${stats.totalQuotedAmount.toLocaleString()}`} />
        <StatCard icon={Smile} label="Avg Sentiment" value={stats.averageSentimentScore.toFixed(1)} sub="/ 5" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Call Volume by Week">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.callVolumeByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="calls" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Conversion Rate by Week">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.conversionByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Booking Status Breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.bookingStatusBreakdown}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
              >
                {stats.bookingStatusBreakdown.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={BOOKING_COLORS[entry.status] || '#9ca3af'}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Customer Sentiment Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.sentimentDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="sentiment" type="category" tick={{ fontSize: 12 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stats.sentimentDistribution.map((entry) => (
                  <Cell
                    key={entry.sentiment}
                    fill={SENTIMENT_COLORS[entry.sentiment] || '#9ca3af'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Quotes Over Time">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.quotesOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="totalQuoted" stroke="#4f46e5" fill="#e0e7ff" />
              <Area type="monotone" dataKey="averageQuote" stroke="#10b981" fill="#d1fae5" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Services Requested">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.topServices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="service" type="category" tick={{ fontSize: 12 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent conversions table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Conversions</h3>
        {stats.recentConversions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No conversions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-500">File</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Customer</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Amount</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentConversions.map((c, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-900">{c.filename}</td>
                  <td className="py-2 px-3 text-gray-600">{c.customerName || '-'}</td>
                  <td className="py-2 px-3 text-gray-900 font-medium">
                    {c.amount ? `$${c.amount.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{new Date(c.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
