import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/apiAuth";



export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rules = await prisma.errorRewriteRule.findMany({
      include: { repository: { select: { owner: true, name: true } } }
    });
    const repos = await prisma.repository.findMany({
      select: { id: true, owner: true, name: true }
    });
    return NextResponse.json({ rules, repos });
  } catch (error: any) {
    console.error("Error fetching rewrite rules", error);
    return NextResponse.json({ error: error.message || "Failed to fetch rewrite rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await req.json();
    if (!data.repositoryId || !data.errorRegex || !data.rewriteTo) {
      return NextResponse.json({ error: "repositoryId, errorRegex and rewriteTo are required" }, { status: 400 });
    }
    const rule = await prisma.errorRewriteRule.create({
      data: {
        repositoryId: data.repositoryId,
        name: data.name,
        errorRegex: data.errorRegex,
        rewriteTo: data.rewriteTo,
        isActive: data.isActive
      },
      include: { repository: { select: { owner: true, name: true } } }
    });
    return NextResponse.json(rule);
  } catch (error: any) {
    console.error("Error creating rewrite rule", error);
    return NextResponse.json({ error: error.message || "Failed to create rewrite rule" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.errorRewriteRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting rewrite rule", error);
    return NextResponse.json({ error: error.message || "Failed to delete rewrite rule" }, { status: 500 });
  }
}
