import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const templates = await prisma.promptTemplate.findMany({
      where: { repositoryId: id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const json = await request.json();
    const { name, systemPrompt, template, isActive } = json;

    if (!name || !template) {
      return NextResponse.json({ error: 'Name and template are required' }, { status: 400 });
    }

    const newTemplate = await prisma.promptTemplate.create({
      data: {
        repositoryId: id,
        name,
        systemPrompt: systemPrompt || null,
        template,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(newTemplate);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
