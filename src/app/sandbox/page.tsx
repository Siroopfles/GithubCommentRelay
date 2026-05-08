"use client";

import { useState } from "react";
import Sidebar from "@/app/Sidebar";

export default function SandboxPage() {
  const [regex, setRegex] = useState("");
  const [text, setText] = useState("");
  const [flags, setFlags] = useState("gi");

  let matchResult = null;
  let error = null;

  try {
    if (regex && text) {
      const re = new RegExp(regex, flags);
      const matches = [...text.matchAll(re)];

      if (matches.length > 0) {
        matchResult = matches.map((m) => {
          const groups = m.groups ? Object.entries(m.groups).map(([k, v]) => `${k}: ${v}`) : [];
          return {
            fullMatch: m[0],
            groups: groups.length > 0 ? groups : m.slice(1),
          };
        });
      }
    }
  } catch (err: any) {
    error = err.message;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Regex Sandbox</h1>
        <p className="text-gray-600 mb-8">
          Test your dependency bot regex or other extraction patterns here.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regular Expression
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  /
                </span>
                <input
                  type="text"
                  value={regex}
                  onChange={(e) => setRegex(e.target.value)}
                  className="flex-1 block w-full min-w-0 rounded-none sm:text-sm border-gray-300 p-2 border"
                  placeholder="(?<name>.*) bumped from (?<old>.*) to (?<new>.*)"
                />
                <span className="inline-flex items-center px-3 rounded-none border border-l-0 border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  /
                </span>
                <input
                  type="text"
                  value={flags}
                  onChange={(e) => setFlags(e.target.value)}
                  className="w-16 block rounded-r-md sm:text-sm border-gray-300 p-2 border border-l-0"
                  placeholder="flags"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Text (Bot Comment)
              </label>
              <textarea
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="shadow-sm block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                placeholder="Paste the raw bot comment here..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Match Results
            </label>
            <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-4 h-[calc(100%-1.75rem)] overflow-auto">
              {!regex || !text ? (
                <p className="text-gray-500 text-sm italic">Enter regex and text to see results</p>
              ) : matchResult ? (
                <div className="space-y-4">
                  {matchResult.map((match, i) => (
                    <div key={i} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <div className="mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Match {i + 1}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Full Match:</span>
                        <pre className="mt-1 text-sm bg-white p-2 rounded border border-gray-200 whitespace-pre-wrap">
                          {match.fullMatch}
                        </pre>
                      </div>
                      {match.groups.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Capture Groups:</span>
                          <ul className="mt-1 list-disc pl-5 text-sm text-gray-600">
                            {match.groups.map((g: any, j: number) => (
                              <li key={j}>{g}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-amber-600 text-sm">No matches found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
