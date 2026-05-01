import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';

export async function GET() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);

    const loadAvg = os.loadavg();
    const cpus = os.cpus().length;
    const cpuLoadPercent = Math.round((loadAvg[0] / cpus) * 100);

    let diskSpace = 'N/A';
    try {
        const { execSync } = require('child_process');
        const output = execSync('df -h / | tail -n 1').toString();
        const parts = output.trim().split(/\s+/);
        if (parts.length >= 5) {
            diskSpace = parts[4]; // Use percentage
        }
    } catch(e) {}

    return NextResponse.json({
      cpu: cpuLoadPercent,
      memory: memPercent,
      disk: diskSpace,
      uptime: os.uptime(),
      loadAvg: loadAvg[0]
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
