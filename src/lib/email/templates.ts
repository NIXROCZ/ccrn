const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
const shell = (title: string, body: string): string => `<div style="font-family:Arial,sans-serif;color:#304033;max-width:640px"><h1 style="color:#6b7a66">${escapeHtml(title)}</h1>${body}<p style="color:#6b7a66">Raising Noble · Wollongong NSW, Australia</p></div>`;

export function magicLinkEmail(url: string) {
  return { subject: 'Your Raising Noble downloads link', text: `Open your secure downloads link: ${url}`, html: shell('Your downloads link', `<p><a href="${escapeHtml(url)}">Open your downloads</a></p><p>This link expires in 15 minutes.</p>`) };
}

export function contactRelayEmail(data: { name: string; email: string; topic: string; message: string }) {
  return { subject: `Contact form: ${data.topic}`, text: `${data.name} (${data.email})\n\n${data.message}`, html: shell('New contact message', `<p><strong>${escapeHtml(data.name)}</strong> · ${escapeHtml(data.email)}</p><p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>`), replyTo: data.email };
}

export function newsletterConfirmEmail(url: string) {
  return { subject: 'Confirm your Raising Noble newsletter subscription', text: `Confirm your subscription: ${url}`, html: shell('Confirm your subscription', `<p><a href="${escapeHtml(url)}">Confirm subscription</a></p>`) };
}

export function giftCardEmail(data: { code: string; amount: string; recipientName?: string; message?: string }) {
  return { subject: 'A Raising Noble gift card for you', text: `${data.recipientName ? `Hi ${data.recipientName},\n\n` : ''}Your Raising Noble gift card is ${data.code} (${data.amount}).${data.message ? `\n\n${data.message}` : ''}`, html: shell('A gift for you', `<p>${data.recipientName ? `Hi ${escapeHtml(data.recipientName)},` : ''}</p><p>Your Raising Noble gift card is <strong>${escapeHtml(data.code)}</strong> (${escapeHtml(data.amount)}).</p>${data.message ? `<p>${escapeHtml(data.message)}</p>` : ''}`) };
}

export function orderReceiptEmail(data: { orderNumber: string; email: string; downloadUrl: string }) {
  return { subject: `Raising Noble order ${data.orderNumber}`, text: `Your order ${data.orderNumber} is confirmed. Visit ${data.downloadUrl} to access your downloads.`, html: shell(`Order ${data.orderNumber}`, `<p>Your order is confirmed.</p><p><a href="${escapeHtml(data.downloadUrl)}">Access your downloads</a></p>`) };
}

export function simpleNoticeEmail(subject: string, text: string) {
  return { subject, text, html: shell(subject, `<p>${escapeHtml(text)}</p>`) };
}
