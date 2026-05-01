import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });

    if (!settings) {
      return NextResponse.json({ setupCompleted: false });
    }

    return NextResponse.json({ setupCompleted: settings.setupCompleted });
  } catch (error) {
    console.error('Error fetching setup status:', error);
    return NextResponse.json({ error: 'Failed to fetch setup status' }, { status: 500 });
  }
}
