import type { Env } from '../../env';

export type EmailMessage = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string };

export async function sendEmail(env: Env, message: EmailMessage): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.FROM_EMAIL, to: message.to, subject: message.subject, html: message.html, text: message.text, reply_to: message.replyTo }),
  });
  if (!response.ok) throw new Error(`Email request failed (${response.status})`);
}
