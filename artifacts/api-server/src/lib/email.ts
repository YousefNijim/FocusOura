import { Resend } from "resend";
import { logger } from "./logger.js";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL ?? "Focusoura <noreply@codeoura.com>";
const APP_URL = process.env.APP_URL ?? "https://focusoura.vercel.app";

export async function sendVerificationEmail(
  to: string,
  displayName: string,
  token: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Verify your Focusoura email 🌱",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#2d6a4f">Welcome to Focusoura! 🌱</h2>
          <p>Hi ${displayName},</p>
          <p>One last step before your plants start growing.</p>
          <p>Click the button below to verify your email address.
             This link expires in <strong>24 hours</strong>.</p>
          <a href="${verifyUrl}"
             style="display:inline-block;margin:24px 0;padding:12px 24px;
                    background:#2d6a4f;color:#fff;border-radius:8px;
                    text-decoration:none;font-weight:600">
            Verify my email →
          </a>
          <p style="color:#888;font-size:13px">
            If you did not create a Focusoura account,
            you can safely ignore this email.
          </p>
        </div>
      `,
      text: [
        `Hi ${displayName},`,
        "",
        "Welcome to Focusoura! One last step before your plants start growing.",
        "",
        "Click the link below to verify your email address.",
        "This link expires in 24 hours.",
        "",
        verifyUrl,
        "",
        "If you did not create a Focusoura account, you can safely ignore this email.",
      ].join("\n"),
    });

    logger.info({ msg: "Verification email sent", to });
  } catch (error) {
    logger.error({
      msg: "Failed to send verification email",
      to,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  displayName: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Reset your Focusoura password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#2d6a4f">Password Reset</h2>
          <p>Hi ${displayName},</p>
          <p>You requested a password reset for your Focusoura account.</p>
          <p>Click the button below to set a new password.
             This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}"
             style="display:inline-block;margin:24px 0;padding:12px 24px;
                    background:#2d6a4f;color:#fff;border-radius:8px;
                    text-decoration:none;font-weight:600">
            Reset my password →
          </a>
          <p style="color:#888;font-size:13px">
            If you did not request this, ignore this email.
            Your password will not change.
          </p>
        </div>
      `,
      text: [
        `Hi ${displayName},`,
        "",
        "You requested a password reset for your Focusoura account.",
        "Click the link below to set a new password. This link expires in 1 hour.",
        "",
        resetUrl,
        "",
        "If you did not request this, ignore this email.",
      ].join("\n"),
    });

    logger.info({ msg: "Password reset email sent", to });
  } catch (error) {
    logger.error({
      msg: "Failed to send password reset email",
      to,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
