import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

async function isAuthenticated() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return false;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.sessionSecret) return false;

  const session = await verifySession(
    settings.sessionSecret,
    sessionCookie.value,
  );
  return !!session?.loggedIn;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rules = await prisma.notificationRule.findMany({
      select: {
        id: true,
        type: true,
        name: true,
        targetUrl: true,
        chatId: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpFrom: true,
        smtpTo: true,
        events: true,
        isActive: true,
      },
    });
    const settings = await prisma.settings.findFirst();
    return NextResponse.json({
      rules,
      hasHealthApiToken: !!settings?.healthApiToken,
      hasRssSecretToken: !!settings?.rssSecretToken,
      rssEvents: settings?.rssEvents || "[]",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    // Check if it's a settings update
    if (body.type === "update_settings") {
      const settings = await prisma.settings.findFirst();
      if (!settings)
        return NextResponse.json(
          { error: "Settings not found" },
          { status: 404 },
        );

      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          healthApiToken: body.healthApiToken,
          rssSecretToken: body.rssSecretToken,
          rssEvents: body.rssEvents,
        },
      });
      return NextResponse.json({ success: true });
    }

    // Otherwise it's a new rule
    const rule = await prisma.notificationRule.create({
      data: {
        type: body.ruleType,
        name: body.name,
        targetUrl: body.targetUrl,
        token: body.token
          ? encrypt(body.token, process.env.ENCRYPTION_KEY || "")
          : null,
        chatId: body.chatId,
        smtpHost: body.smtpHost,
        smtpPort: body.smtpPort ? parseInt(String(body.smtpPort), 10) : null,
        smtpUser: body.smtpUser,
        smtpPass: body.smtpPass
          ? encrypt(body.smtpPass, process.env.ENCRYPTION_KEY || "")
          : null,
        smtpFrom: body.smtpFrom,
        smtpTo: body.smtpTo,
        events: body.events, // JSON string
        isActive: body.isActive ?? true,
        settingsId: (await prisma.settings.findFirst())?.id || 1,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.notificationRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
