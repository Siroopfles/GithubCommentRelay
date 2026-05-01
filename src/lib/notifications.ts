import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export enum NotificationEvent {
  SYSTEM_ERROR = "SYSTEM_ERROR",
  PR_AGGREGATED = "PR_AGGREGATED",
  AI_TASK_COMPLETED = "AI_TASK_COMPLETED",
  DAILY_SUMMARY = "DAILY_SUMMARY",
}

interface NotificationPayload {
  title: string;
  message: string;
  data?: any;
}

export async function dispatchNotification(
  event: NotificationEvent,
  payload: NotificationPayload,
) {
  try {
    const rules = await prisma.notificationRule.findMany({
      where: { isActive: true },
    });

    for (const rule of rules) {
      let selectedEvents: string[] = [];
      try {
        selectedEvents = JSON.parse(rule.events);
      } catch (e) {
        continue;
      }

      if (!selectedEvents.includes(event)) continue;

      try {
        switch (rule.type) {
          case "discord":
            await sendDiscord(rule.targetUrl!, payload);
            break;
          case "telegram":
            await sendTelegram(rule.token!, rule.chatId!, payload);
            break;
          case "ntfy":
            await sendNtfy(rule.targetUrl!, payload);
            break;
          case "gotify":
            await sendGotify(rule.targetUrl!, rule.token!, payload);
            break;
          case "webhook":
            await sendWebhook(rule.targetUrl!, event, payload);
            break;
          case "smtp":
            await sendSmtp(rule, payload);
            break;
        }
      } catch (ruleError) {
        console.error(
          `Failed to dispatch notification for rule ${rule.name}:`,
          ruleError,
        );
      }
    }
  } catch (err) {
    console.error("Error dispatching notifications:", err);
  }
}

async function sendDiscord(webhookUrl: string, payload: NotificationPayload) {
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: payload.title,
          description: payload.message,
          color: 3447003, // blue
        },
      ],
    }),
  });
}

async function sendTelegram(
  token: string,
  chatId: string,
  payload: NotificationPayload,
) {
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `*${payload.title}*\n${payload.message}`,
      parse_mode: "Markdown",
    }),
  });
}

async function sendNtfy(url: string, payload: NotificationPayload) {
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: {
      Title: payload.title,
      "Content-Type": "text/plain",
    },
    body: payload.message,
  });
}

async function sendGotify(
  url: string,
  token: string,
  payload: NotificationPayload,
) {
  if (!url || !token) return;
  // Gotify expects standard URL + message endpoint
  const endpoint = url.endsWith("/") ? `${url}message` : `${url}/message`;
  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gotify-Key": token,
    },
    body: JSON.stringify({
      title: payload.title,
      message: payload.message,
      priority: 5,
    }),
  });
}

async function sendWebhook(
  url: string,
  event: string,
  payload: NotificationPayload,
) {
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, payload }),
  });
}

async function sendSmtp(rule: any, payload: NotificationPayload) {
  if (!rule.smtpHost || !rule.smtpPort || !rule.smtpFrom || !rule.smtpTo)
    return;

  const transporter = nodemailer.createTransport({
    host: rule.smtpHost,
    port: rule.smtpPort,
    secure: rule.smtpPort === 465, // true for 465, false for other ports
    auth:
      rule.smtpUser && rule.smtpPass
        ? {
            user: rule.smtpUser,
            pass: rule.smtpPass,
          }
        : undefined,
  });

  await transporter.sendMail({
    from: rule.smtpFrom,
    to: rule.smtpTo,
    subject: payload.title,
    text: payload.message,
    html: `<h2>${payload.title}</h2><p>${payload.message.replace(/\n/g, "<br/>")}</p>`,
  });
}
