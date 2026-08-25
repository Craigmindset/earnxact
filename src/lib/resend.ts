import { Resend } from "resend";

const ADMIN_RECIPIENTS = [
  "craig2infinity@gmail.com",
  "fridaymaduka1988@gmail.com",
];

// Changed from onboarding@resend.dev to your verified domain:
const ALERT_SENDER = "EarnXact Alert <notifications@earnxact.com>";
const SIGNUP_ALERT_SUBJECT = "🎉 New User Sign-Up Alert - EarnXact";

type SendSignupAlertParams = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  registeredAt: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendNewUserSignupAlert({
  email,
  firstName,
  lastName,
  phoneNumber,
  registeredAt,
}: SendSignupAlertParams) {
  const apiKey = process.env.NEXT_RESEND_API_KEY || process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing NEXT_RESEND_API_KEY or RESEND_API_KEY environment variable.",
    );
  }

  const resend = new Resend(apiKey);
  const safeEmail = escapeHtml(email);
  const safeFirstName = escapeHtml(firstName || "Not provided");
  const safeLastName = escapeHtml(lastName || "Not provided");
  const safePhoneNumber = escapeHtml(phoneNumber || "Not provided");
  const safeRegisteredAt = escapeHtml(registeredAt);

  await resend.emails.send({
    from: ALERT_SENDER,
    to: ADMIN_RECIPIENTS,
    subject: SIGNUP_ALERT_SUBJECT,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="margin: 0 0 16px; font-size: 22px;">New EarnXact Signup</h1>
        <p style="margin: 0 0 12px;">A new user has completed signup on EarnXact.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 520px;">
          <tr>
            <td style="padding: 8px 0; font-weight: 700;">Email</td>
            <td style="padding: 8px 0;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 700;">First Name</td>
            <td style="padding: 8px 0;">${safeFirstName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 700;">Last Name</td>
            <td style="padding: 8px 0;">${safeLastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 700;">Phone Number</td>
            <td style="padding: 8px 0;">${safePhoneNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 700;">Registered At</td>
            <td style="padding: 8px 0;">${safeRegisteredAt}</td>
          </tr>
        </table>
      </div>
    `,
  });
}
