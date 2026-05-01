import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
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
    // return last 100
    const tailLines = lines.slice(-100);

    return NextResponse.json({ logs: tailLines });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
  }
}
