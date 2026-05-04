import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/apiAuth";



export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rules = await prisma.flakyTestRule.findMany({
      include: { repository: { select: { owner: true, name: true } } }
    });
    const repos = await prisma.repository.findMany({
      select: { id: true, owner: true, name: true }
    });
    return NextResponse.json({ rules, repos });
  } catch (error: any) {
    logger.error("Error fetching flaky rules", { error });
    return NextResponse.json({ error: error.message || "Failed to fetch flaky rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await req.json();
    if (!data.repositoryId || !data.testNameRegex) {
      return NextResponse.json({ error: "repositoryId and testNameRegex are required" }, { status: 400 });
    }
    if (typeof data.testNameRegex !== "string" || data.testNameRegex.length > 500) {
      return NextResponse.json({ error: "testNameRegex must be a string <= 500 chars" }, { status: 400 });
    }
    try {
      new RegExp(data.testNameRegex, "i");
    } catch (e) {
      return NextResponse.json({ error: "Invalid regex pattern" }, { status: 400 });
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
    logger.error("Error creating flaky rule", { error });
    return NextResponse.json({ error: error.message || "Failed to create flaky rule" }, { status: 500 });
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
    await prisma.flakyTestRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error deleting flaky rule", { error });
    return NextResponse.json({ error: error.message || "Failed to delete flaky rule" }, { status: 500 });
  }
}
