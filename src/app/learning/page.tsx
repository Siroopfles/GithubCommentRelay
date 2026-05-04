"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  BugOff,
  FileEdit,
  Clock
} from "lucide-react";

export default function LearningDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/learning/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            Learning & Feedback Loops
          </h1>
          <p className="text-gray-500 mt-2">
            Zorg dat je AI-agents en de tool over tijd slimmer en accurater worden (Categorie Q).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Metric 1: Upvotes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Totale Upvotes</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalUpvotes || 0}</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <ThumbsUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Agent Oplossingen Gewaardeerd</p>
        </div>

        {/* Metric 2: Downvotes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Totale Downvotes</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalDownvotes || 0}</h3>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <ThumbsDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Agent Oplossingen Afgekeurd</p>
        </div>

        {/* Metric 3: Flaky Tests Ignored */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Flaky Errors Genegeerd</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalFlakyIgnored || 0}</h3>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <BugOff className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Spook-bugs vermeden</p>
        </div>

        {/* Metric 4: Rewrites Applied */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Fouten Herschreven</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalRewritesApplied || 0}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileEdit className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Vage fouten vertaald voor AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Navigation to Config Pages */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Configuratie Panelen</h2>

          <Link href="/learning/flaky-tests" className="block">
            <div className="bg-white border border-gray-200 p-5 rounded-lg hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-700 rounded-full">
                <BugOff className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Flaky Test Detectie</h3>
                <p className="text-sm text-gray-500">Markeer regexes voor willekeurig falende tests om deze te negeren.</p>
              </div>
            </div>
          </Link>

          <Link href="/learning/error-rewrites" className="block">
            <div className="bg-white border border-gray-200 p-5 rounded-lg hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                <FileEdit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Error Rewrites</h3>
                <p className="text-sm text-gray-500">Vertaal cryptische CI-fouten naar duidelijke menselijke instructies voor de AI.</p>
              </div>
            </div>
          </Link>

        </div>

        {/* TTR Analytics (Time To Resolution) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Time-to-Resolution (TTR)
            </h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-6">Gemiddelde tijd (in minuten) vanaf detectie tot PR merge, gegroepeerd per fouttype.</p>

            {stats?.ttrMetrics && stats.ttrMetrics.length > 0 ? (
              <div className="space-y-4">
                {stats.ttrMetrics.map((metric: any, i: number) => (
                  <div key={i} className="flex flex-col">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{metric.category}</span>
                      <span className="font-mono text-gray-600">{Math.round(metric.avgDuration / 60)} min</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${Math.min(100, (metric.avgDuration / stats.maxTtr) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                Nog onvoldoende data verzameld voor TTR analytics.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
