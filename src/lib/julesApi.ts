export const JULES_API_BASE = 'https://jules.googleapis.com/v1alpha';

export async function createSession(apiKey: string, prompt: string, source: string, revision?: string) {
  const body: any = { prompt };

  if (source) {
    body.sourceContext = { source };
    if (revision) {
      body.sourceContext.revision = revision;
    }
  }

  const res = await fetch(`${JULES_API_BASE}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Jules API Error creating session: ${await res.text()}`);
  }

  return res.json();
}

export async function sendMessage(apiKey: string, sessionId: string, message: string) {
  if (!/^\d+$/.test(sessionId)) {
    throw new Error('sessionId must be a numeric string');
  }

  const res = await fetch(`${JULES_API_BASE}/sessions/${sessionId}:sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ prompt: message })
  });

  if (!res.ok) {
    throw new Error(`Jules API Error sending message: ${await res.text()}`);
  }

  return res.json();
}
