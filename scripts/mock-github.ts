import * as http from 'http';
import { parse } from 'url';

const PORT = 3001;

// Simple state
const pullRequests = [
  {
    number: 1,
    state: "open",
    title: "Mock PR 1",
    user: { login: "testuser" },
    head: { ref: "feature-1" }
  }
];

const issueComments = [
  {
    id: 101,
    user: { login: "mock-bot" },
    body: "This is a mock bot comment. Fix this line.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const parsedUrl = parse(req.url || '', true);
  const path = parsedUrl.pathname || '';

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`[Mock GitHub] ${req.method} ${path}`);

  // Mock /user (get authenticated user)
  if (path === '/user' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ login: 'testuser', id: 1 }));
    return;
  }

  // Mock /repos/{owner}/{repo}/pulls
  if (path.match(/^\/repos\/[^/]+\/[^/]+\/pulls$/) && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify(pullRequests));
    return;
  }

  // Mock /repos/{owner}/{repo}/issues/{issue_number}/comments
  if (path.match(/^\/repos\/[^/]+\/[^/]+\/issues\/\d+\/comments$/)) {
    if (req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(issueComments));
      return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const newComment = {
            id: Date.now(),
            user: { login: "testuser" },
            body: parsed.body || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          issueComments.push(newComment);
          res.writeHead(201);
          res.end(JSON.stringify(newComment));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }
  }

  // Fallback for everything else
  res.writeHead(200);
  res.end(JSON.stringify({ message: "Mock GitHub Server: Route not fully implemented", data: [] }));
});

server.listen(PORT, () => {
  console.log(`Mock GitHub server running on http://localhost:${PORT}`);
  console.log('To use this mock server, configure Octokit to use this baseUrl.');
  console.log(`Example: new Octokit({ baseUrl: 'http://localhost:${PORT}' })`);
});
