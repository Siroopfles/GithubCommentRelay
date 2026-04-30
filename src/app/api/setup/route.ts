import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password || password.length < 16) {
      return NextResponse.json({ error: 'Password must be at least 16 characters long' }, { status: 400 });
    }

    let settings = await prisma.settings.findUnique({ where: { id: 1 } });

    if (settings?.setupCompleted) {
      return NextResponse.json({ error: 'Setup already completed' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const sessionSecret = crypto.randomBytes(32).toString('hex');

    await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        masterPasswordHash: hashedPassword,
        setupCompleted: true,
        sessionSecret: sessionSecret,
      },
      create: {
        id: 1,
        masterPasswordHash: hashedPassword,
        setupCompleted: true,
        sessionSecret: sessionSecret,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 });
  }
}
