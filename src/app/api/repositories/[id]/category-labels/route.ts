import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth';
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
        const json = await request.json();

        if (!json.category || !json.labelName) {
            return NextResponse.json({ error: "category and labelName are required" }, { status: 400 });
        }

        const label = await prisma.categoryLabelMapping.upsert({
            where: {
                repositoryId_category: {
                    repositoryId: id,
                    category: json.category
                }
            },
            update: {
                labelName: json.labelName
            },
            create: {
                repositoryId: id,
                category: json.category,
                labelName: json.labelName
            }
        });

        return NextResponse.json(label);
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to create/update label mapping' }, { status: 500 })
    }
}
