import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const mappings = await prisma.botAgentMapping.findMany();
    return NextResponse.json(mappings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { botSource, agentName } = json;

    if (!botSource || !agentName) {
      return NextResponse.json({ error: 'botSource and agentName are required' }, { status: 400 });
    }

    const mapping = await prisma.botAgentMapping.create({
      data: { botSource, agentName }
    });
    return NextResponse.json(mapping);
  } catch (error: any) {
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Mapping for this bot already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create mapping' }, { status: 500 });
  }
}
