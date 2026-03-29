import nodemailer from "nodemailer";

const FROM = process.env.SMTP_FROM_EMAIL ?? "Reimbursement <noreply@example.com>";

export class MailDeliveryError extends Error {
  code: "SMTP_CONFIG_MISSING" | "SMTP_SEND_FAILED";
  constructor(code: "SMTP_CONFIG_MISSING" | "SMTP_SEND_FAILED", message: string) {
    super(message);
    this.name = "MailDeliveryError";
    this.code = code;
  }
}

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

function getTransporter(): nodemailer.Transporter {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !portRaw || !user || !pass) {
    throw new MailDeliveryError(
      "SMTP_CONFIG_MISSING",
      "Missing SMTP configuration. Expected SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS."
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    throw new MailDeliveryError("SMTP_CONFIG_MISSING", "SMTP_PORT must be a valid number.");
  }

  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv ? secureEnv === "true" : port === 465;

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

async function sendEmailOrThrow(input: SendEmailInput): Promise<void> {
  const transporter = getTransporter();
  try {
    await transporter.sendMail({
      from: FROM,
      to: Array.isArray(input.to) ? input.to.join(", ") : input.to,
      subject: input.subject,
      html: input.html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP send error";
    throw new MailDeliveryError("SMTP_SEND_FAILED", `Nodemailer send failed: ${message}`);
  }
}

const C = {
  primary: "#F8F9ED",
  accent: "#5E4075",
  text: "#1A1A2E",
  muted: "#6B7280",
  success: "#4CAF7C",
  danger: "#E05252",
  border: "#E2E4D8",
  surface: "#FFFFFF",
} as const;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layoutEmail(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reimbursement</title></head>
<body style="margin:0;padding:0;background-color:${C.primary};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${C.primary};">
  <tr><td align="center" style="padding:28px 16px 40px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${C.surface};border-radius:12px;border:1px solid ${C.border};box-shadow:0 4px 24px rgba(30,26,46,0.06);">
      <tr><td style="background:linear-gradient(135deg,${C.accent} 0%,#4a3360 100%);padding:22px 26px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(248,249,237,0.88);">Reimbursement</p>
        <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:${C.primary};line-height:1.25;">Expense claims &amp; approvals</p>
      </td></tr>
      <tr><td style="padding:26px 26px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${C.text};">${innerHtml}</td></tr>
      <tr><td style="padding:8px 26px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:${C.muted};border-top:1px solid ${C.border};">
        <p style="margin:18px 0 0;">You're receiving this because it relates to your Reimbursement workspace. If anything looks wrong, contact your administrator.</p>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.muted};max-width:560px;">© Reimbursement · Internal expense management</p>
  </td></tr>
</table>
</body>
</html>`;
}

function calloutPassword(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:${C.primary};border:1px solid ${C.border};border-radius:8px;">
  <tr><td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.04em;">${label}</p>
    <p style="margin:0;font-family:ui-monospace,monospace;font-size:16px;font-weight:700;color:${C.text};word-break:break-all;">${value}</p>
  </td></tr>
</table>`;
}

function badge(text: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;color:${color};background:${bg};">${text}</span>`;
}

export async function sendLoginNotificationEmail(to: string, name: string): Promise<void> {
  const n = escapeHtml(name);
  const inner = `<p style="margin:0 0 16px;">Hello ${n},</p>
<p style="margin:0 0 16px;">We noticed a <strong>successful sign-in</strong> to your Reimbursement account.</p>
<p style="margin:0 0 16px;">If this was you, you can ignore this email. If you don't recognize this activity, change your password and contact your admin.</p>
<p style="margin:0;">${badge("Security", C.accent, C.primary)}</p>`;
  await sendEmailOrThrow({ to, subject: "Sign-in alert · Reimbursement", html: layoutEmail(inner) });
}

export async function sendPasswordResetEmail(to: string, name: string, tempPassword: string): Promise<void> {
  const n = escapeHtml(name);
  const pw = escapeHtml(tempPassword);
  const inner = `<p style="margin:0 0 16px;">Hello ${n},</p>
<p style="margin:0 0 16px;">Your admin has reset your access. Use the temporary password below to sign in, then set a new one immediately.</p>
${calloutPassword("Temporary password", pw)}
<p style="margin:16px 0 0;font-size:13px;color:${C.muted};">For your security, don't share this password once you've logged in.</p>`;
  await sendEmailOrThrow({ to, subject: "Your temporary Reimbursement password", html: layoutEmail(inner) });
}

export async function sendNewUserPasswordEmail(to: string, name: string, tempPassword: string): Promise<void> {
  const n = escapeHtml(name);
  const pw = escapeHtml(tempPassword);
  const inner = `<p style="margin:0 0 16px;">Welcome, ${n}</p>
<p style="margin:0 0 16px;">Your team added you to <strong>Reimbursement</strong>. Sign in with the temporary password below.</p>
${calloutPassword("First-time sign-in password", pw)}
<p style="margin:16px 0 0;font-size:13px;color:${C.muted};">After your first login you'll be prompted to choose your own password.</p>`;
  await sendEmailOrThrow({ to, subject: "Welcome to Reimbursement — your account is ready", html: layoutEmail(inner) });
}

export async function sendExpenseSubmittedEmail(
  approverEmails: string[],
  approverName: string,
  employeeName: string,
  expenseTitle: string,
  amount: string
): Promise<void> {
  const an = escapeHtml(approverName);
  const en = escapeHtml(employeeName);
  const title = escapeHtml(expenseTitle);
  const amt = escapeHtml(amount);
  for (const to of approverEmails) {
    const inner = `<p style="margin:0 0 16px;">Hello ${an},</p>
<p style="margin:0 0 16px;">${en} has submitted a new expense that needs your review.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:${C.primary};border:1px solid ${C.border};border-radius:8px;">
  <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;">Claim</p>
    <p style="margin:0 0 10px;font-size:17px;font-weight:700;color:${C.text};">${title}</p>
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;">Amount</p>
    <p style="margin:0;font-size:18px;font-weight:700;color:${C.accent};">${amt}</p>
  </td></tr>
</table>
<p style="margin:18px 0 0;">${badge("Action required", C.accent, C.primary)}</p>`;
    await sendEmailOrThrow({ to, subject: `Review needed: ${expenseTitle}`, html: layoutEmail(inner) });
  }
}

export async function sendExpenseApprovedEmail(to: string, employeeName: string, expenseTitle: string): Promise<void> {
  const en = escapeHtml(employeeName);
  const title = escapeHtml(expenseTitle);
  const inner = `<p style="margin:0 0 16px;">Hello ${en},</p>
<p style="margin:0 0 16px;">An approver has <strong style="color:${C.success};">signed off</strong> on your expense <strong>${title}</strong>.</p>
<p style="margin:18px 0 0;">${badge("Approved (step)", C.success, "rgba(76,175,124,0.12)")}</p>`;
  await sendEmailOrThrow({ to, subject: `Expense approved: ${expenseTitle}`, html: layoutEmail(inner) });
}

export async function sendExpenseRejectedEmail(to: string, employeeName: string, expenseTitle: string, comment: string): Promise<void> {
  const en = escapeHtml(employeeName);
  const title = escapeHtml(expenseTitle);
  const reason = escapeHtml(comment);
  const inner = `<p style="margin:0 0 16px;">Hello ${en},</p>
<p style="margin:0 0 16px;">Your expense <strong>${title}</strong> was <strong style="color:${C.danger};">not approved</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border-left:4px solid ${C.danger};background:${C.primary};border-radius:0 8px 8px 0;">
  <tr><td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;">Approver feedback</p>
    <p style="margin:0;font-size:15px;line-height:1.55;color:${C.text};">${reason}</p>
  </td></tr>
</table>
<p style="margin:0;">Review the comment above and reach out to your approver if anything is unclear.</p>`;
  await sendEmailOrThrow({ to, subject: `Update on your expense: ${expenseTitle}`, html: layoutEmail(inner) });
}

export async function sendExpenseFinalApprovedEmail(to: string, employeeName: string, expenseTitle: string): Promise<void> {
  const en = escapeHtml(employeeName);
  const title = escapeHtml(expenseTitle);
  const inner = `<p style="margin:0 0 16px;">Hello ${en},</p>
<p style="margin:0 0 16px;">Your expense <strong>${title}</strong> has received <strong style="color:${C.success};">all required approvals</strong> and is cleared for reimbursement.</p>
<p style="margin:18px 0 0;">${badge("Fully approved", C.success, "rgba(76,175,124,0.14)")}</p>`;
  await sendEmailOrThrow({ to, subject: `All set for reimbursement: ${expenseTitle}`, html: layoutEmail(inner) });
}

// ─── notifyApprovers — called by submit route ─────────────────────────────────

type NotifyApproversInput = {
  expense: {
    title: string;
    amount: number;
    currencyCode: string;
    amountInCompanyCurrency: number;
  };
  employee: { name: string };
  approvers: { name: string; email: string }[];
  companyCurrencyCode: string;
};

export async function notifyApprovers({
  expense,
  employee,
  approvers,
  companyCurrencyCode,
}: NotifyApproversInput): Promise<void> {
  if (!approvers?.length) return;
  const amountStr = `${expense.amount} ${expense.currencyCode} (≈ ${expense.amountInCompanyCurrency} ${companyCurrencyCode})`;
  for (const approver of approvers) {
    if (!approver.email) continue;
    await sendExpenseSubmittedEmail([approver.email], approver.name, employee.name, expense.title, amountStr);
  }
}
