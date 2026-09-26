const MOCK = process.env.EMAIL_MOCK !== "false";

/**
 * Real mode is NOT implemented — needs a real email provider (Resend, Postmark,
 * SES, etc.) and an API key before EMAIL_MOCK can be set to false. Until then,
 * this just logs what would have been sent, so the failure-notification flow
 * can be built and tested end to end without a provider on hand yet.
 */
export async function sendFailureNotification(params: {
  to: string;
  businessName: string;
  contactName: string;
  reason: string;
}): Promise<void> {
  const { to, businessName, contactName, reason } = params;
  const subject = `ReviewFlow: a message to ${contactName} failed to send`;
  const body = `A message from ${businessName} to ${contactName} failed to send.\n\nReason: ${reason}`;

  if (MOCK) {
    console.log(`[mock email] to=${to} subject="${subject}"\n${body}`);
    return;
  }

  throw new Error(
    "Real email sending isn't wired up yet — set EMAIL_MOCK=true, or add a real provider first."
  );
}

export const isEmailMocked = MOCK;
