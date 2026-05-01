import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

async function isAuthenticated() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return false;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.sessionSecret) return false;

  const session = await verifySession(settings.sessionSecret, sessionCookie.value);
  return !!session?.loggedIn;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.db')) {
        return NextResponse.json({ error: 'Invalid file type. Must be a .db file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Check if the uploaded db is at least a valid SQLite file (starts with "SQLite format 3")
    if (buffer.length < 16 || buffer.toString('utf8', 0, 16) !== 'SQLite format 3\0') {
      return NextResponse.json({ error: 'Invalid database file format' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

    // Create an emergency backup of the current DB just in case
    if (fs.existsSync(dbPath)) {
       const emergencyBackupPath = path.join(process.cwd(), 'backups', `emergency-pre-restore-${Date.now()}.db`);
       if (!fs.existsSync(path.join(process.cwd(), 'backups'))) {
          fs.mkdirSync(path.join(process.cwd(), 'backups'), { recursive: true });
       }
       fs.copyFileSync(dbPath, emergencyBackupPath);
       logger.info(`Created emergency backup before restore at ${emergencyBackupPath}`);
    }

    // Write the new db
    fs.writeFileSync(dbPath, buffer);
    logger.info(`Database restored successfully from uploaded file: ${file.name}`);

    // Trigger process restart (assuming pm2)
    const restartCommand = `pm2 restart all || (echo "PM2 not found, skipping restart." && true)`;
    spawn(restartCommand, {
        shell: true,
        detached: true,
        stdio: 'ignore'
    }).unref();

    return NextResponse.json({ message: 'Database restored successfully. The application will restart shortly.' });
  } catch (error) {
    logger.error('Failed to restore database:', error);
    return NextResponse.json({ error: 'Internal server error during restore' }, { status: 500 });
  }
}
