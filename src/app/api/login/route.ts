import { sessionStore } from "@/lib/sessionStore";
import crypto from "crypto";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });

    if (!settings || !settings.setupCompleted || !settings.masterPasswordHash || !settings.sessionSecret) {
      return NextResponse.json({ error: 'System not set up yet' }, { status: 400 });
    }

    const isValid = await verifyPassword(password, settings.masterPasswordHash);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Derive the encryption key using the master password
    const encryptionKey = crypto.scryptSync(password, settings.sessionSecret, 32).toString('hex');

    // Create JWT Session - DO NOT INCLUDE encryptionKey IN PAYLOAD
    const sessionId = crypto.randomBytes(16).toString('hex');
    sessionStore.set(sessionId, encryptionKey);
    const sessionToken = await createSession(settings.sessionSecret, { loggedIn: true, sessionId }, '24h');

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    // Send the encryption key to the worker via local IPC
    try {
      await fetch('http://127.0.0.1:3001/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: encryptionKey }),
      });
    } catch (workerError) {
      console.warn('Worker might not be running or IPC failed:', workerError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
