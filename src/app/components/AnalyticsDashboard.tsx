'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts';
import { Clock, CheckCircle2, TrendingUp, Activity } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(async res => {
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to fetch analytics');
        }
        return payload;
      })
      .then(d => {
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Fout bij ophalen van data');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laden van analytics...</div>;
  }

  if (error || !data?.metrics) {
    return <div className="p-8 text-center text-red-500">{error || 'Fout bij ophalen van data'}</div>;
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Gem. Resolutie Tijd</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.metrics.avgResolutionTimeHours} uur
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">AI Succes Ratio</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.metrics.aiSuccessRatio}%
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Opgeloste PRs</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.metrics.totalResolved}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">AI Acties</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.metrics.totalAiActions}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Heatmap (Comments per day) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Bot Activiteit Heatmap (Laatste 30 dagen)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.heatmapData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Comments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Fout-Categorieën</h3>
          <div className="h-64 flex items-center justify-center">
            {data.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">Geen categorie data beschikbaar.</p>
            )}
          </div>
        </div>

        {/* Rate Limit Line Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">GitHub API Rate Limit (Laatste 24 uur)</h3>
          <div className="h-72">
            {data.rateLimitData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.rateLimitData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="time" tick={{fontSize: 12}} />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="remaining" stroke="#8b5cf6" strokeWidth={2} name="Remaining Requests" dot={false} />
                    <Line type="monotone" dataKey="limit" stroke="#10b981" strokeWidth={2} name="Limit" dot={false} strokeDasharray="5 5" />
                </LineChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-center text-gray-500 mt-10">Geen rate limit data beschikbaar (wordt pas geregistreerd bij API calls).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
