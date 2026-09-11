const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
const shell = (title: string, body: string): string => `<div style="font-family:Arial,sans-serif;color:#304033;max-width:640px;line-height:1.6"><h1 style="color:#6b7a66">${escapeHtml(title)}</h1>${body}<hr style="border:0;border-top:1px solid #d9dfd5;margin:2rem 0"><p style="color:#6b7a66;font-size:13px">Raising Noble · Wollongong NSW, Australia<br><a href="https://raisingnoble.com/terms" style="color:#6b7a66">Terms</a> · <a href="https://raisingnoble.com/privacy" style="color:#6b7a66">Privacy</a></p></div>`;

export function magicLinkEmail(url: string) {
  return { subject: 'Your Raising Noble downloads link', text: `Open your secure downloads link: ${url}\n\nThis link expires in 15 minutes.`, html: shell('Your downloads link', `<p><a href="${escapeHtml(url)}">Open your downloads</a></p><p>This link expires in 15 minutes.</p>`) };
}

export function contactRelayEmail(data: { name: string; email: string; topic: string; message: string }) {
  return { subject: `Contact form: ${data.topic}`, text: `${data.name} (${data.email})\n\n${data.message}`, html: shell('New contact message', `<p><strong>${escapeHtml(data.name)}</strong> · ${escapeHtml(data.email)}</p><p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>`), replyTo: data.email };
}

export function newsletterConfirmEmail(url: string) {
  return { subject: 'Confirm your Raising Noble newsletter subscription', text: `Confirm your subscription: ${url}`, html: shell('Confirm your subscription', `<p><a href="${escapeHtml(url)}">Confirm subscription</a></p>`) };
}

export function giftCardEmail(data: { code: string; amount: string; expires: string; recipientName?: string; message?: string }) {
  const greeting = data.recipientName ? `Hi ${data.recipientName},\n\n` : '';
  const message = data.message ? `\n\n${data.message}` : '';
  return {
    subject: 'A Raising Noble gift card for you',
    text: `${greeting}Your Raising Noble gift card is ${data.code} (${data.amount}).\n\nEnter this code at checkout when buying a kit. It is valid until ${data.expires}, and any remaining balance is tracked automatically.${message}`,
    html: shell('A gift for you', `<p>${data.recipientName ? `Hi ${escapeHtml(data.recipientName)},` : ''}</p><p>Your Raising Noble gift card is <strong>${escapeHtml(data.code)}</strong> (${escapeHtml(data.amount)}).</p>${data.message ? `<p>${escapeHtml(data.message)}</p>` : ''}<p>Enter this code at checkout when buying a kit. It is valid until <strong>${escapeHtml(data.expires)}</strong>, and any remaining balance is tracked automatically.</p>`),
  };
}

export function orderReceiptEmail(data: { orderNumber: string; email: string; downloadUrl: string; date: string; kits: Array<{ title: string; amount: string }>; gifts: string[]; bundleDiscount: string | null; giftApplied: string | null; total: string }) {
  const kitText = data.kits.map((kit) => `- ${kit.title}: ${kit.amount}`).join('\n');
  const giftText = data.gifts.map((gift, index) => `- Gift card ${index + 1}: ${gift}`).join('\n');
  const rows = [
    ...data.kits.map((kit) => `<li>${escapeHtml(kit.title)}: ${escapeHtml(kit.amount)}</li>`),
    ...data.gifts.map((gift, index) => `<li>Gift card ${index + 1}: ${escapeHtml(gift)}</li>`),
    data.bundleDiscount ? `<li>Bundle discount: −${escapeHtml(data.bundleDiscount)}</li>` : '',
    data.giftApplied ? `<li>Gift card credit: −${escapeHtml(data.giftApplied)}</li>` : '',
    `<li><strong>Total charged: ${escapeHtml(data.total)}</strong></li>`,
  ].filter(Boolean).join('');
  return {
    subject: `Raising Noble order ${data.orderNumber}`,
    text: `Order ${data.orderNumber}\nDate: ${data.date}\n\n${kitText}${giftText ? `\n${giftText}` : ''}${data.bundleDiscount ? `\n- Bundle discount: -${data.bundleDiscount}` : ''}${data.giftApplied ? `\n- Gift card credit: -${data.giftApplied}` : ''}\n- Total charged: ${data.total}\n\nAccess your downloads: ${data.downloadUrl}\n\nLicence reminder: kits are for personal, single-household use. Sharing files is not permitted.\nIf a file is faulty or missing, reply to this email.`,
    html: shell(`Order ${data.orderNumber}`, `<p>Date: ${escapeHtml(data.date)}</p><ul>${rows}</ul><p><a href="${escapeHtml(data.downloadUrl)}">Access your downloads</a></p><p>Licence reminder: kits are for personal, single-household use. Sharing files is not permitted.</p><p>If a file is faulty or missing, reply to this email.</p>`),
  };
}

export function simpleNoticeEmail(subject: string, text: string) {
  return { subject, text, html: shell(subject, `<p>${escapeHtml(text)}</p>`) };
}
