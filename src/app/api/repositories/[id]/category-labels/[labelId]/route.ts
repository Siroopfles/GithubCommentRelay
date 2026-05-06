import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth';
import { isAuthenticated } from '@/lib/session';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, labelId: string }> }) {
    try {
        if (!(await isAuthenticated())) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const resolvedParams = await params;
        const { id, labelId } = resolvedParams;

        await prisma.categoryLabelMapping.delete({
            where: { id: labelId, repositoryId: id }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        if (e.code === 'P2025') {
            return NextResponse.json({ error: 'Label mapping not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete label mapping' }, { status: 500 });
    }
}
