const REDACTION_PATTERNS = [
  // Emails
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },

  // Passwords in URLs (e.g., https://user:pass@host)
  { regex: /(https?:\/\/[^\s:@]+:)([^@\s]+)(@[^\s]+)/g, replacement: '$1[REDACTED_PASSWORD]$3' },

  // AWS Access Keys (basic heuristic)
  { regex: /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/g, replacement: '[REDACTED_AWS_KEY]' },

  // GitHub Tokens (ghp_, gho_, ghu_, ghs_, ghr_)
  { regex: /(?:gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{20,})/g, replacement: '[REDACTED_GITHUB_TOKEN]' },

  // JWT Tokens (heuristic: header.payload.signature)
  { regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, replacement: '[REDACTED_JWT]' },

  // Generic "sk-..." secret keys (like OpenAI, Stripe)
  { regex: /\bsk-[a-zA-Z0-9]{20,}\b/g, replacement: '[REDACTED_SECRET_KEY]' },

  // Generic Bearer tokens
  { regex: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g, replacement: 'Bearer [REDACTED_BEARER_TOKEN]' },
];

export function redactPII(text: string): string {
  if (!text) return text;

  let redactedText = text;
  for (const { regex, replacement } of REDACTION_PATTERNS) {
    redactedText = redactedText.replace(regex, replacement);
  }

  return redactedText;
}
