import { availableKits } from '../lib/catalogue';
import { formatAud, priceCart, type Cart } from '../lib/pricing';

const emptyCart = (): Cart => ({ kits: [], gifts: [], giftCodes: [] });
const readCart = (): Cart => { try { return { ...emptyCart(), ...JSON.parse(localStorage.getItem('rn_cart_v1') ?? '{}') }; } catch { return emptyCart(); } };
const saveCart = (cart: Cart) => { localStorage.setItem('rn_cart_v1', JSON.stringify(cart)); window.dispatchEvent(new CustomEvent('rn:cart')); };
const toast = (message: string) => { const el = document.querySelector<HTMLElement>('#toast'); if (!el) return; el.textContent = message; el.classList.add('on'); window.setTimeout(() => el.classList.remove('on'), 2600); };
const updateCount = () => { const count = readCart().kits.length + readCart().gifts.length; document.querySelectorAll('#cart-count').forEach((el) => { el.textContent = String(count); }); };

document.querySelector('#burger')?.addEventListener('click', () => {
  const nav = document.querySelector('#nav'); const button = document.querySelector<HTMLButtonElement>('#burger');
  nav?.classList.toggle('open'); button?.setAttribute('aria-expanded', String(nav?.classList.contains('open')));
});
document.querySelectorAll<HTMLElement>('.add-kit').forEach((button) => button.addEventListener('click', () => {
  const cart = readCart(); const id = button.dataset.kit;
  if (!id || cart.kits.includes(id)) return toast('That kit is already in your cart.');
  cart.kits.push(id); saveCart(cart); toast('Added to your cart.');
}));
document.querySelectorAll<HTMLElement>('.notify-kit').forEach((button) => button.addEventListener('click', () => {
  const email = window.prompt('What email should we notify?'); if (!email || !button.dataset.kit) return;
  fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, kitId: button.dataset.kit }) }).catch(() => undefined);
  toast('Thanks — we will let you know when it is ready.');
}));
const params = new URLSearchParams(window.location.search);
const category = params.get('c'); const age = params.get('age')?.split('-').map(Number);
document.querySelectorAll<HTMLElement>('[data-cat][data-min][data-max]').forEach((card) => {
  const matchesCategory = !category || category === 'all' || card.dataset.cat === category;
  const min = Number(card.dataset.min); const max = Number(card.dataset.max);
  const matchesAge = !age || (min <= age[1] && max >= age[0]);
  card.hidden = !(matchesCategory && matchesAge);
});
document.querySelectorAll<HTMLElement>('.filter').forEach((button) => button.addEventListener('click', () => {
  const next = new URL(window.location.href); const key = button.dataset.filterKey; const value = button.dataset.filterValue;
  if (key && value) next.searchParams.set(key, value); window.location.href = next.toString();
}));
document.querySelectorAll<HTMLFormElement>('form[data-endpoint]:not(#gift-code-form)').forEach((form) => form.addEventListener('submit', async (event) => {
  event.preventDefault(); const endpoint = form.dataset.endpoint; if (!endpoint) return;
  const payload = Object.fromEntries(new FormData(form)); const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  toast(response.ok ? 'Thanks — your message has been sent.' : 'Please try again in a moment.');
}));
document.querySelectorAll<HTMLFormElement>('#checkout-form').forEach((form) => form.addEventListener('submit', async (event) => {
  event.preventDefault(); const confirmed = form.querySelector<HTMLInputElement>('[name=au]')?.checked; if (!confirmed) return toast('Please confirm you are purchasing from Australia.');
  const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(readCart()) }); const data = await response.json().catch(() => ({}));
  if (response.ok && data.url) window.location.href = data.url; else toast('Checkout will be available when payments are connected.');
}));
document.querySelectorAll<HTMLElement>('.gift-amount').forEach((button) => button.addEventListener('click', () => {
  const input = document.querySelector<HTMLInputElement>('#amount');
  if (input) input.value = String(Number(button.dataset.amount) / 100);
}));
document.querySelector<HTMLFormElement>('#gift-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement));
  const amountCents = Math.round(Number(data.amountCents) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 1000 || amountCents > 50000) return toast('Choose an amount between A$10 and A$500.');
  const cart = readCart(); cart.gifts.push({ amountCents, recipientName: String(data.recipientName || ''), recipientEmail: String(data.recipientEmail || ''), message: String(data.message || '') }); saveCart(cart); toast('Gift card added to your cart.');
});
const renderCart = () => {
  const cart = readCart(); const ids = availableKits().map((kit) => kit.id); const totals = priceCart(cart, ids);
  document.querySelectorAll<HTMLElement>('[data-cart-line]').forEach((line) => { line.hidden = !cart.kits.includes(line.dataset.cartLine ?? ''); });
  const giftLines = document.querySelector<HTMLElement>('#gift-cart-lines');
  if (giftLines) {
    giftLines.replaceChildren();
    cart.gifts.forEach((gift, index) => {
      const line = document.createElement('div');
      line.className = 'cart-line';
      const label = document.createElement('span');
      label.textContent = `Gift card${gift.recipientName ? ` for ${gift.recipientName}` : ''}`;
      const price = document.createElement('span');
      price.textContent = formatAud(gift.amountCents);
      const remove = document.createElement('button');
      remove.className = 'tlink';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        const next = readCart();
        next.gifts.splice(index, 1);
        saveCart(next);
      });
      price.append(' ', remove);
      line.append(label, price);
      giftLines.append(line);
    });
  }
  const values: Record<string, number> = { '#cart-subtotal': totals.kitSubtotal + totals.giftSubtotal, '#cart-discount': totals.bundleDiscount, '#cart-total': totals.total };
  Object.entries(values).forEach(([selector, value]) => { const el = document.querySelector(selector); if (el) el.textContent = formatAud(value); });
};
renderCart();
window.addEventListener('rn:cart', renderCart);
document.querySelector<HTMLFormElement>('#gift-code-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const code = String(new FormData(form).get('code') ?? '').trim();
  const cart = readCart();
  if (!code || cart.giftCodes.includes(code)) return toast('Enter a new gift card code.');
  if (cart.giftCodes.length >= 3) return toast('You can apply up to three gift codes.');
  const response = await fetch('/api/gift/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  if (!response.ok) return toast('We could not check that gift card yet.');
  cart.giftCodes.push(code);
  saveCart(cart);
  form.reset();
  toast('Gift card applied.');
});
document.querySelectorAll<HTMLElement>('[data-cart-line]').forEach((line) => line.querySelector('button')?.addEventListener('click', () => {
  const id = line.dataset.cartLine; if (!id) return; const cart = readCart(); cart.kits = cart.kits.filter((kit) => kit !== id); saveCart(cart); window.location.reload();
}));
window.addEventListener('rn:cart', updateCount); updateCount();
void formatAud; void priceCart; void availableKits;
