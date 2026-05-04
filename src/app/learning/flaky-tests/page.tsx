"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

export default function FlakyTestsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[]>([]);

  const [newRule, setNewRule] = useState({
    repositoryId: "",
    name: "",
    testNameRegex: "",
    isActive: true,
  });

  useEffect(() => {
    fetch("/api/learning/flaky")
      .then(r => r.json())
      .then(data => {
        setRules(data.rules ?? []);
        setRepos(data.repos ?? []);
      })
      .catch(err => console.error("Failed to load flaky rules", err));
  }, []);

  const handleAdd = async () => {
    if (!newRule.repositoryId || !newRule.testNameRegex) return;
    const res = await fetch("/api/learning/flaky", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRule)
    });
    if (res.ok) {
      const added = await res.json();
      setRules([...rules, added]);
      setNewRule({ repositoryId: "", name: "", testNameRegex: "", isActive: true });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/learning/flaky?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/learning" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Flaky Test Detectie</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Nieuwe Flaky Rule Toevoegen</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            className="border border-gray-300 rounded-md p-2"
            value={newRule.repositoryId}
            onChange={(e) => setNewRule({...newRule, repositoryId: e.target.value})}
          >
            <option value="">Selecteer Repo...</option>
            {repos.map((r: any) => (
              <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Naam (bijv. Random Timeout)"
            className="border border-gray-300 rounded-md p-2"
            value={newRule.name}
            onChange={(e) => setNewRule({...newRule, name: e.target.value})}
          />
          <input
            type="text"
            placeholder="Regex (bijv. Timeout of .*ms)"
            className="border border-gray-300 rounded-md p-2 font-mono text-sm"
            value={newRule.testNameRegex}
            onChange={(e) => setNewRule({...newRule, testNameRegex: e.target.value})}
          />
          <button
            onClick={handleAdd}
            className="bg-indigo-600 text-white rounded-md p-2 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" /> Toevoegen
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repository</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naam</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regex</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ignored Count</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actie</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.repository?.owner}/{rule.repository?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{rule.testNameRegex}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="bg-gray-100 text-gray-800 py-1 px-2 rounded-full text-xs font-bold">{rule.ignoreCount}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Geen regels gevonden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
