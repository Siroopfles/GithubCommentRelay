import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rules = await prisma.flakyTestRule.findMany({
      include: { repository: { select: { owner: true, name: true } } }
    });
    const repos = await prisma.repository.findMany({
      select: { id: true, owner: true, name: true }
    });
    return NextResponse.json({ rules, repos });
  } catch (error: any) {
    console.error("Error fetching flaky rules", error);
    return NextResponse.json({ error: error.message || "Failed to fetch flaky rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data.repositoryId || !data.testNameRegex) {
      return NextResponse.json({ error: "repositoryId and testNameRegex are required" }, { status: 400 });
    }
    const rule = await prisma.flakyTestRule.create({
      data: {
        repositoryId: data.repositoryId,
        name: data.name,
        testNameRegex: data.testNameRegex,
        isActive: data.isActive
      },
      include: { repository: { select: { owner: true, name: true } } }
    });
    return NextResponse.json(rule);
  } catch (error: any) {
    console.error("Error creating flaky rule", error);
    return NextResponse.json({ error: error.message || "Failed to create flaky rule" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.flakyTestRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting flaky rule", error);
    return NextResponse.json({ error: error.message || "Failed to delete flaky rule" }, { status: 500 });
  }
}
