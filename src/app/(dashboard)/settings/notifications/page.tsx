"use client";

import React, { useState, useEffect } from "react";

export default function NotificationsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [healthApiToken, setHealthApiToken] = useState("");
  const [rssSecretToken, setRssSecretToken] = useState("");
  const [rssEvents, setRssEvents] = useState<string[]>([]);

  // New rule state
  const [name, setName] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpTo, setSmtpTo] = useState("");
  const [ruleType, setRuleType] = useState("discord");
  const [events, setEvents] = useState<string[]>([]);
  const [targetUrl, setTargetUrl] = useState("");
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");

  const availableEvents = [
    "SYSTEM_ERROR",
    "PR_AGGREGATED",
    "AI_TASK_COMPLETED",
    "DAILY_SUMMARY",
  ];

  const loadData = async () => {
    const res = await fetch("/api/settings/notifications");
    const data = await res.json();
    setRules(data.rules || []);
    setHealthApiToken(data.healthApiToken || "");
    setRssSecretToken(data.rssSecretToken || "");
    try {
      setRssEvents(JSON.parse(data.rssEvents || "[]"));
    } catch {
      setRssEvents([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async () => {
    await fetch("/api/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "update_settings",
        healthApiToken,
        rssSecretToken,
        rssEvents: JSON.stringify(rssEvents),
      }),
    });
    alert("Settings saved!");
  };

  const addRule = async () => {
    await fetch("/api/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ruleType,
        name,
        targetUrl,
        token,
        chatId,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpTo,
        events: JSON.stringify(events),
        isActive: true,
      }),
    });
    setName("");
    loadData();
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/settings/notifications?id=${id}`, { method: "DELETE" });
    loadData();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notifications & Integrations</h1>

      {/* Global Settings */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            System Health API Token (/api/health)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="border p-2 rounded flex-1"
              value={healthApiToken}
              onChange={(e) => setHealthApiToken(e.target.value)}
              placeholder="Enter a secret token for Uptime Kuma..."
            />
            <button
              className="bg-gray-200 px-4 rounded"
              onClick={() => setHealthApiToken(window.crypto.randomUUID())}
            >
              Generate
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            RSS Feed Secret Token (/api/feed/[token])
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="border p-2 rounded flex-1"
              value={rssSecretToken}
              onChange={(e) => setRssSecretToken(e.target.value)}
              placeholder="Enter a secret token for RSS feed..."
            />
            <button
              className="bg-gray-200 px-4 rounded"
              onClick={() => setRssSecretToken(window.crypto.randomUUID())}
            >
              Generate
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Events to include in RSS Feed:
          </p>
          <div className="flex gap-4">
            {["SYSTEM_ERROR", "PR_AGGREGATED"].map((ev) => (
              <label key={ev} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={rssEvents.includes(ev)}
                  onChange={(e) => {
                    if (e.target.checked) setRssEvents([...rssEvents, ev]);
                    else setRssEvents(rssEvents.filter((x) => x !== ev));
                  }}
                />{" "}
                {ev}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={saveSettings}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save Global Settings
        </button>
      </div>

      {/* Notification Rules */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Notification Rules</h2>

        {rules.map((rule) => (
          <div
            key={rule.id}
            className="border p-4 mb-4 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-bold">
                {rule.name}{" "}
                <span className="text-sm bg-gray-200 px-2 rounded ml-2">
                  {rule.type}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                Events: {JSON.parse(rule.events || "[]").join(", ")}
              </p>
            </div>
            <button
              onClick={() => deleteRule(rule.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}

        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-medium mb-4">Add New Rule</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Rule Name"
              className="border p-2 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="border p-2 rounded"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value)}
            >
              <option value="discord">Discord</option>
              <option value="telegram">Telegram</option>
              <option value="ntfy">Ntfy</option>
              <option value="gotify">Gotify</option>
              <option value="webhook">Custom Webhook</option>
              <option value="smtp">Email (SMTP)</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Trigger Events
            </label>
            <div className="flex gap-4 flex-wrap">
              {availableEvents.map((ev) => (
                <label key={ev} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={(e) => {
                      if (e.target.checked) setEvents([...events, ev]);
                      else setEvents(events.filter((x) => x !== ev));
                    }}
                  />{" "}
                  {ev}
                </label>
              ))}
            </div>
          </div>

          {(ruleType === "discord" ||
            ruleType === "webhook" ||
            ruleType === "ntfy" ||
            ruleType === "gotify") && (
            <input
              type="text"
              placeholder="Webhook / Target URL"
              className="border p-2 rounded w-full mb-4"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
          )}

          {(ruleType === "telegram" || ruleType === "gotify") && (
            <input
              type="text"
              placeholder="Token"
              className="border p-2 rounded w-full mb-4"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          )}

          {ruleType === "smtp" && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="SMTP Host (e.g. smtp.gmail.com)"
                  className="border p-2 rounded w-full"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="SMTP Port (e.g. 587 or 465)"
                  className="border p-2 rounded w-full"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="SMTP Username"
                  className="border p-2 rounded w-full"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="SMTP Password"
                  className="border p-2 rounded w-full"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="From Address (e.g. bot@domain.com)"
                  className="border p-2 rounded w-full"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="To Address"
                  className="border p-2 rounded w-full"
                  value={smtpTo}
                  onChange={(e) => setSmtpTo(e.target.value)}
                />
              </div>
            </>
          )}

          {ruleType === "telegram" && (
            <input
              type="text"
              placeholder="Chat ID"
              className="border p-2 rounded w-full mb-4"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
          )}

          <button
            onClick={addRule}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Add Rule
          </button>
        </div>
      </div>
    </div>
  );
}
