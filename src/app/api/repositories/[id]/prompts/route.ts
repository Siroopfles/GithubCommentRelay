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

    if (typeof name !== 'string' || name.trim() === '' || typeof template !== 'string' || template === '') {
      return NextResponse.json({ error: 'Name and template are required strings' }, { status: 400 });
    }
    if (systemPrompt !== undefined && systemPrompt !== null && typeof systemPrompt !== 'string') {
      return NextResponse.json({ error: 'systemPrompt must be a string or null' }, { status: 400 });
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }
    if (name.length > 200 || template.length > 10000 || (typeof systemPrompt === 'string' && systemPrompt.length > 10000)) {
      return NextResponse.json({ error: 'Field too long' }, { status: 400 });
    }

    try {
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
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2025') {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
      }
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: 'A prompt template with this name already exists' }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    console.error('Prompt list fetch/create error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
