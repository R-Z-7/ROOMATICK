import { Resend } from "resend";

// We abstract the provider so you can easily swap Resend for SendGrid or Brevo later.
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (payload: EmailPayload): Promise<{ success: boolean; error?: string }> => {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || "notifications@flatflow.app";

  if (!apiKey) {
    console.warn("No EMAIL_PROVIDER_API_KEY found. Mocking email delivery.");
    console.log(`Mock Email sent to ${payload.to}: ${payload.subject}`);
    return { success: true };
  }

  // Initialize Resend
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: `FlatFlow <${senderEmail}>`,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      console.error("Resend delivery failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error sending email:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
};
