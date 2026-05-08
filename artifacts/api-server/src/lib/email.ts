import { logger } from "./logger.js";

const RESEND_API = "https://api.resend.com/emails";

export async function sendVerificationEmail({
  to,
  displayName,
  verifyLink,
}: {
  to: string;
  displayName: string;
  verifyLink: string;
}): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your Focusoura email 🌱",
    text: [
      `Hi ${displayName},`,
      "",
      "Welcome to Focusoura! One last step before your plants start growing.",
      "",
      "Click the link below to verify your email address.",
      "This link expires in 24 hours.",
      "",
      verifyLink,
      "",
      "If you did not create a Focusoura account, you can safely ignore this email.",
    ].join("\n"),
  });
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ msg: "RESEND_API_KEY not set — email skipped", context: { to, subject } });
    return;
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "FocusOura <noreply@focusoura.com>",
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    logger.error({ msg: "Resend API error", error: err, context: { to, subject } });
    throw new Error("Email delivery failed");
  }
}
