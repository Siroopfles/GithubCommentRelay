import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rules = await prisma.flakyTestRule.findMany({
    include: { repository: { select: { owner: true, name: true } } }
  });
  const repos = await prisma.repository.findMany({
    select: { id: true, owner: true, name: true }
  });
  return NextResponse.json({ rules, repos });
}

export async function POST(req: Request) {
  const data = await req.json();
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
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) await prisma.flakyTestRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
