import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth';
import { isAuthenticated } from '@/lib/session';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAuthenticated())) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const labels = await prisma.categoryLabelMapping.findMany({
            where: { repositoryId: id }
        });

        return NextResponse.json(labels);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAuthenticated())) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const resolvedParams = await params;
        const id = resolvedParams.id;
                let json: { category?: string; labelName?: string };
        try {
            json = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        if (!json.category || !json.labelName) {
            return NextResponse.json({ error: "category and labelName are required" }, { status: 400 });
        }

        const validCategories = ['general', 'lint', 'security', 'type_error', 'test_failure'];
        if (!validCategories.includes(json.category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }


        const label = await prisma.categoryLabelMapping.upsert({
            where: {
                repositoryId_category: {
                    repositoryId: id,
                    category: json.category as import("@prisma/client").ProcessedCommentCategory
                }
            },
            update: {
                labelName: json.labelName
            },
            create: {
                repositoryId: id,
                category: json.category as import("@prisma/client").ProcessedCommentCategory,
                labelName: json.labelName
            }
        });

        return NextResponse.json(label);
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to create/update label mapping' }, { status: 500 })
    }
}
