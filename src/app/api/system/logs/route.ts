import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const logPath = path.join(process.cwd(), 'logs', 'combined.log');
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ logs: [] });
    }

    // Read the last ~100 lines for a simple log viewer
    const bufferSize = 1024 * 16; // 16KB window for reading tail
    const stats = fs.statSync(logPath);
    const startPos = Math.max(0, stats.size - bufferSize);

    const stream = fs.createReadStream(logPath, { start: startPos });
    let data = '';

    for await (const chunk of stream) {
        data += chunk;
    }

    const lines = data.split('\n').filter(Boolean);
    const cleanLines = startPos > 0 ? lines.slice(1) : lines;
    const tailLines = cleanLines.slice(-100);

    return NextResponse.json({ logs: tailLines });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
  }
}
