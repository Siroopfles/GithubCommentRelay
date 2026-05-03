import { NextResponse } from 'next/server';
import os from 'os';
import { isAuthenticated } from '@/lib/auth';
import { execSync } from 'child_process';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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
        const output = execSync('df -h / | tail -n 1').toString();
        const parts = output.trim().split(/\s+/);
        if (parts.length >= 5) {
            diskSpace = parts[4]; // Use percentage
        }
    } catch(e) { console.error('Failed to get disk space:', e); }

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
