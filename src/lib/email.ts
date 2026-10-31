import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";

let resendClient: Resend | null = null;

function getResend() {
  if (!env.resendApiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

export async function sendWelcomeEmail(input: {
  to: string;
  courseTitle: string;
  courseSlug: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "Email is not configured." };
  }

  const from = env.emailFrom || "SkillShelf <onboarding@resend.dev>";
  const courseUrl = `${env.siteUrl}/courses/${input.courseSlug}`;

  try {
    const { error } = await resend.emails.send({
      from,
      to: [input.to],
      subject: `Welcome to ${input.courseTitle}`,
      text: [
        `Hi there,`,
        "",
        `You now have access to ${input.courseTitle}.`,
        "",
        `Open the course here: ${courseUrl}`,
        "",
        "You can watch the lessons anytime from your account. If you run into any issues, just reply to this email and we'll help.",
        "",
        "— SkillShelf",
      ].join("\n"),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 20px; margin: 0 0 16px;">Welcome to ${escapeHtml(input.courseTitle)}</h1>
          <p style="margin: 0 0 16px; color: #374151;">You now have access to the course. Watch the lessons anytime from your account.</p>
          <p style="margin: 24px 0;">
            <a href="${courseUrl}" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 10px;">Open ${escapeHtml(input.courseTitle)}</a>
          </p>
          <p style="margin: 32px 0 0; color: #6b7280; font-size: 13px;">If you run into any issues, just reply to this email and we'll help.<br/>— SkillShelf</p>
        </div>
      `,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not send email.",
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
