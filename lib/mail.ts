import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Reimbursement <noreply@reimbursement.app>";

/** App palette — mirrors globals.css for on-brand email rendering */
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
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layoutEmail(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>Reimbursement</title>
</head>
<body style="margin:0;padding:0;background-color:${C.primary};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${C.primary};">
  <tr>
    <td align="center" style="padding:28px 16px 40px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${C.surface};border-radius:12px;border:1px solid ${C.border};box-shadow:0 4px 24px rgba(30,26,46,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,${C.accent} 0%,#4a3360 100%);padding:22px 26px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(248,249,237,0.88);">Reimbursement</p>
            <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:${C.primary};line-height:1.25;">Expense claims & approvals</p>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 26px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${C.text};">
            ${innerHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 26px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:${C.muted};border-top:1px solid ${C.border};">
            <p style="margin:18px 0 0;">You’re receiving this because it relates to your Reimbursement workspace—submitting claims, approvals, or account security. If anything looks wrong, contact your administrator.</p>
          </td>
        </tr>
      </table>
      <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.muted};max-width:560px;">© Reimbursement · Internal expense management</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function calloutPassword(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:${C.primary};border:1px solid ${C.border};border-radius:8px;">
    <tr>
      <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.04em;">${label}</p>
        <p style="margin:0;font-family:ui-monospace,'Cascadia Mono','Segoe UI Mono',Consolas,monospace;font-size:16px;font-weight:700;letter-spacing:0.02em;color:${C.text};word-break:break-all;">${value}</p>
      </td>
    </tr>
  </table>`;
}

function badge(text: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;color:${color};background:${bg};">${text}</span>`;
}

export async function sendLoginNotificationEmail(to: string, name: string): Promise<void> {
  const n = escapeHtml(name);
  const inner = `<p style="margin:0 0 16px;">Hello ${n},</p>
<p style="margin:0 0 16px;">We noticed a <strong>successful sign-in</strong> to your Reimbursement account. That usually means you or someone with your credentials opened the app on a new device or browser session.</p>
<p style="margin:0 0 16px;">If this was you, you can ignore this email. If you don’t recognize this activity, change your password right away and tell your admin so they can help secure your workspace.</p>
<p style="margin:0;">${badge("Security", C.accent, C.primary)}</p>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Sign-in alert · Reimbursement",
    html: layoutEmail(inner),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  tempPassword: string
): Promise<void> {
  const n = escapeHtml(name);
  const pw = escapeHtml(tempPassword);
  const inner = `<p style="margin:0 0 16px;">Hello ${n},</p>
<p style="margin:0 0 16px;">Your admin has reset your access. Use the temporary password below to sign in to Reimbursement, then pick a new password as soon as you’re in—this one is only for getting you back into your account.</p>
${calloutPassword("Temporary password", pw)}
<p style="margin:16px 0 0;font-size:13px;color:${C.muted};">For your security, don’t share this password or leave it in chat or email once you’ve logged in.</p>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your temporary Reimbursement password",
    html: layoutEmail(inner),
  });
}

export async function sendNewUserPasswordEmail(
  to: string,
  name: string,
  tempPassword: string
): Promise<void> {
  const n = escapeHtml(name);
  const pw = escapeHtml(tempPassword);
  const inner = `<p style="margin:0 0 16px;">Welcome, ${n}</p>
<p style="margin:0 0 16px;">Your team added you to <strong>Reimbursement</strong> so you can submit expense claims and track approvals in one place. To get started, sign in with the temporary password below.</p>
${calloutPassword("First-time sign-in password", pw)}
<p style="margin:16px 0 0;font-size:13px;color:${C.muted};">After your first login you’ll be prompted to choose your own password. Quick tip: use the same email this invite was sent to when signing in.</p>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Reimbursement — your account is ready",
    html: layoutEmail(inner),
  });
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
<p style="margin:0 0 16px;">${en} has submitted a new expense that needs your review in the approval queue.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:${C.primary};border:1px solid ${C.border};border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.04em;">Claim</p>
      <p style="margin:0 0 10px;font-size:17px;font-weight:700;color:${C.text};">${title}</p>
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.04em;">Amount</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:${C.accent};">${amt}</p>
    </td>
  </tr>
</table>
<p style="margin:0;">When you’re ready, open Reimbursement and work through your pending approvals—your decision keeps reimbursements moving for the team.</p>
<p style="margin:18px 0 0;">${badge("Action required", C.accent, C.primary)}</p>`;

    await resend.emails.send({
      from: FROM,
      to,
      subject: `Review needed: ${expenseTitle}`,
      html: layoutEmail(inner),
    });
  }
}

export async function sendExpenseApprovedEmail(
  to: string,
  employeeName: string,
  expenseTitle: string
): Promise<void> {
  const en = escapeHtml(employeeName);
  const title = escapeHtml(expenseTitle);
  const inner = `<p style="margin:0 0 16px;">Hello ${en},</p>
<p style="margin:0 0 16px;">Good news: an approver has <strong style="color:${C.success};">signed off</strong> on your expense <strong>${title}</strong>. It stays in the workflow until all required approvals are complete—you’ll get another note when everything’s fully cleared.</p>
<p style="margin:0;">Thanks for keeping your documentation sharp; it makes processing smoother for finance.</p>
<p style="margin:18px 0 0;">${badge("Approved (step)", C.success, "rgba(76,175,124,0.12)")}</p>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Expense approved: ${expenseTitle}`,
    html: layoutEmail(inner),
  });
}

export async function sendExpenseRejectedEmail(
  to: string,
  employeeName: string,
  expenseTitle: string,
  comment: string
): Promise<void> {
  const en = escapeHtml(employeeName);
  const title = escapeHtml(expenseTitle);
  const reason = escapeHtml(comment);
  const inner = `<p style="margin:0 0 16px;">Hello ${en},</p>
<p style="margin:0 0 16px;">Your expense <strong>${title}</strong> was <strong style="color:${C.danger};">not approved</strong> at this stage. That doesn’t necessarily end the story—you can often fix the issue and resubmit if your process allows it.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border-left:4px solid ${C.danger};background:${C.primary};border-radius:0 8px 8px 0;">
  <tr>
    <td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.04em;">Approver feedback</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${C.text};">${reason}</p>
    </td>
  </tr>
</table>
<p style="margin:0;">Review the comment above, update your claim if needed, and reach out to your approver if anything is unclear.</p>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Update on your expense: ${expenseTitle}`,
    html: layoutEmail(inner),
  });
}

export async function sendExpenseFinalApprovedEmail(
  to: string,
  employeeName: string,
  expenseTitle: string
): Promise<void> {
  const en = escapeHtml(employeeName);
  const title = escapeHtml(expenseTitle);
  const inner = `<p style="margin:0 0 16px;">Hello ${en},</p>
<p style="margin:0 0 16px;">Your expense <strong>${title}</strong> has received <strong style="color:${C.success};">all required approvals</strong>. It’s cleared for reimbursement processing—finance will handle payout according to your organization’s schedule.</p>
<p style="margin:0;">You don’t need to do anything else for this claim unless your team asks for more paperwork. Nice work getting it across the line.</p>
<p style="margin:18px 0 0;">${badge("Fully approved", C.success, "rgba(76,175,124,0.14)")}</p>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `All set for reimbursement: ${expenseTitle}`,
    html: layoutEmail(inner),
  });
}
