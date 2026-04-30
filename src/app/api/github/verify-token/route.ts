import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-PR-Comment-Aggregator'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ valid: false, error: 'Token is invalid or expired' });
      }
      return NextResponse.json({ valid: false, error: `GitHub API error: ${response.statusText}` });
    }

    const scopesHeader = response.headers.get('x-oauth-scopes');
    const scopes = scopesHeader ? scopesHeader.split(',').map(s => s.trim()) : [];

    // Check if it's a fine-grained PAT (they don't always expose x-oauth-scopes nicely via /user,
    // but classic PATs do. We assume 'repo' is required for classic).
    // Fine-grained PATs might not return 'repo' in x-oauth-scopes for /user. We'll do a basic check.
    // If it's a classic PAT, it should have 'repo'.
    const hasRepoScope = scopes.includes('repo');

    // For now, if the token works to fetch /user, it's valid. We'll return the scopes.
    return NextResponse.json({
      valid: true,
      scopes,
      hasRepoScope,
      isLikelyFineGrained: scopes.length === 0 // Often true for fine-grained
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
