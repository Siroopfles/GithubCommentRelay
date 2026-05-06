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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, labelId: string }> }) {
    try {
        if (!(await isAuthenticated())) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const resolvedParams = await params;
        const labelId = resolvedParams.labelId;

        await prisma.categoryLabelMapping.delete({
            where: { id: labelId }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to delete label mapping' }, { status: 500 })
    }
}
