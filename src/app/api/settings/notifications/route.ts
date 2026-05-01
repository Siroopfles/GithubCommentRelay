import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { encrypt } from "@/lib/encryption";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const rules = await prisma.notificationRule.findMany();
    const settings = await prisma.settings.findFirst();
    return NextResponse.json({
      rules,
      healthApiToken: settings?.healthApiToken || "",
      rssSecretToken: settings?.rssSecretToken || "",
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
        settingsId: 1, // Default settings ID
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
