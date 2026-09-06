import { availableKits } from '../lib/catalogue';
import { formatAud, priceCart, type Cart } from '../lib/pricing';

const emptyCart = (): Cart => ({ kits: [], gifts: [], giftCodes: [] });
const readCart = (): Cart => { try { return { ...emptyCart(), ...JSON.parse(localStorage.getItem('rn_cart_v1') ?? '{}') }; } catch { return emptyCart(); } };
const saveCart = (cart: Cart) => { localStorage.setItem('rn_cart_v1', JSON.stringify(cart)); window.dispatchEvent(new CustomEvent('rn:cart')); };
const toast = (message: string) => { const el = document.querySelector<HTMLElement>('#toast'); if (!el) return; el.textContent = message; el.classList.add('on'); window.setTimeout(() => el.classList.remove('on'), 2600); };
let giftCreditCents = 0;
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
document.querySelectorAll<HTMLElement>('.notify-kit').forEach((button) => button.addEventListener('click', async () => {
  const email = window.prompt('What email should we notify?'); if (!email || !button.dataset.kit) return;
  const response = await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, kitId: button.dataset.kit }) }).catch(() => undefined);
  if (!response) return toast('Please try again in a moment.');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return toast(data.error ?? 'Please try again in a moment.');
  toast('Thanks — we will let you know when it is ready.');
}));
/* Shop filtering moved to the client-side chip handler further down, which
   reads the same URL parameters but does not reload the page per click. */
document.querySelectorAll<HTMLElement>('.filter[data-filter-key]').forEach((button) => button.addEventListener('click', () => {
  const next = new URL(window.location.href); const key = button.dataset.filterKey; const value = button.dataset.filterValue;
  if (key && value) next.searchParams.set(key, value); window.location.href = next.toString();
}));
document.querySelectorAll<HTMLFormElement>('form[data-endpoint]:not(#gift-code-form)').forEach((form) => form.addEventListener('submit', async (event) => {
  event.preventDefault(); const endpoint = form.dataset.endpoint; if (!endpoint) return;
  const payload = Object.fromEntries(new FormData(form)); const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json().catch(() => ({}));
  toast(response.ok ? (data.message ?? 'Thanks — your message has been sent.') : (data.error ?? 'Please try again in a moment.'));
}));
document.querySelectorAll<HTMLFormElement>('#checkout-form').forEach((form) => form.addEventListener('submit', async (event) => {
  event.preventDefault(); const confirmed = form.querySelector<HTMLInputElement>('[name=au]')?.checked; if (!confirmed) return toast('Please confirm you are purchasing from Australia.');
  const email = form.querySelector<HTMLInputElement>('[name=email]')?.value.trim(); if (!email) return toast('Enter your email for delivery.');
  const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...readCart(), email }) }); const data = await response.json().catch(() => ({}));
  if (response.ok && data.url) window.location.href = data.url; else toast(data.error ?? 'Checkout could not be started.');
}));
document.querySelectorAll<HTMLElement>('.gift-amount').forEach((button) => button.addEventListener('click', () => {
  const input = document.querySelector<HTMLInputElement>('#amount');
  document.querySelectorAll<HTMLElement>('.gift-amount').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  if (input) input.value = String(Number(button.dataset.amount) / 100);
}));
document.querySelector<HTMLButtonElement>('#custom-amount-toggle')?.addEventListener('click', (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const field = document.getElementById('custom-amount');
  const open = !field?.hasAttribute('hidden');
  field?.toggleAttribute('hidden', open);
  button.setAttribute('aria-expanded', String(!open));
});
document.querySelector<HTMLButtonElement>('#gift-toggle')?.addEventListener('click', (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const fields = document.querySelector<HTMLElement>('[data-gift-fields]');
  const open = !fields?.hasAttribute('hidden');
  fields?.toggleAttribute('hidden', open);
  button.setAttribute('aria-expanded', String(!open));
});
document.querySelector<HTMLFormElement>('#gift-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement));
  const amountCents = Math.round(Number(data.amountCents) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 1000 || amountCents > 50000) return toast('Choose an amount between A$10 and A$500.');
  const cart = readCart();
  // Send undefined rather than "" for untouched fields, so the server's
  // optional-email validation is not tripped by an empty string.
  const optional = (value: FormDataEntryValue | undefined) => { const text = String(value ?? '').trim(); return text ? text : undefined; };
  cart.gifts.push({ amountCents, recipientName: optional(data.recipientName), recipientEmail: optional(data.recipientEmail), message: optional(data.message) });
  saveCart(cart); toast('Gift card added to your cart.');
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
  const credit = Math.min(giftCreditCents, totals.total);
  const values: Record<string, number> = { '#cart-subtotal': totals.kitSubtotal + totals.giftSubtotal, '#cart-discount': totals.bundleDiscount, '#cart-credit': credit, '#cart-total': totals.total - credit };
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.valid) return toast(data.error ?? 'We could not check that gift card yet.');
  cart.giftCodes.push(code);
  giftCreditCents += Number(data.balanceCents) || 0;
  saveCart(cart);
  form.reset();
  toast('Gift card applied.');
});
document.querySelectorAll<HTMLElement>('[data-cart-line]').forEach((line) => line.querySelector('button')?.addEventListener('click', () => {
  const id = line.dataset.cartLine; if (!id) return; const cart = readCart(); cart.kits = cart.kits.filter((kit) => kit !== id); saveCart(cart); window.location.reload();
}));
window.addEventListener('rn:cart', updateCount); updateCount();
void formatAud; void priceCart; void availableKits;

/* ==========================================================================
   PRESENTATION
   Added alongside the existing cart and checkout behaviour, not replacing it.
   Everything here is progressive: the page is complete before it runs, and the
   <noscript> block in the layout covers the case where it never does.
   ========================================================================== */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Scroll reveals ─────────────────────────────────────────────────────── */

const revealTargets = document.querySelectorAll<HTMLElement>('[data-reveal]');
if (reducedMotion || !('IntersectionObserver' in window)) {
  // No observer, or motion is unwelcome: show everything at once. Content must
  // never be left permanently invisible because a browser lacked an API.
  revealTargets.forEach((element) => element.classList.add('in'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  revealTargets.forEach((element) => revealObserver.observe(element));
}

/* ── Films ──────────────────────────────────────────────────────────────── */

/* Autoplay is started here rather than with the attribute, so a reduced-motion
   visitor gets a still poster and never a moving background. */
document.querySelectorAll<HTMLVideoElement>('video[data-film]').forEach((video) => {
  if (reducedMotion) return;
  video.autoplay = true;
  void video.play().catch(() => undefined);
});

/* WCAG 2.2.2: anything moving for more than five seconds needs a control. */
document.querySelectorAll<HTMLButtonElement>('[data-film-toggle]').forEach((button) => {
  const scope = document.querySelector(button.dataset.filmToggle ?? '');
  const video = scope?.querySelector('video');
  if (!(video instanceof HTMLVideoElement)) {
    button.hidden = true;
    return;
  }
  const paint = () => {
    button.textContent = video.paused ? 'Play' : 'Pause';
    button.setAttribute('aria-label', video.paused ? 'Play the film' : 'Pause the film');
  };
  button.addEventListener('click', () => {
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
    paint();
  });
  video.addEventListener('play', paint);
  video.addEventListener('pause', paint);
  paint();
});

/* ── Tabs (WAI-ARIA pattern) ────────────────────────────────────────────── */

document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((root) => {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = tabs
    .map((tab) => document.getElementById(tab.getAttribute('aria-controls') ?? ''))
    .filter((panel): panel is HTMLElement => panel !== null);
  if (tabs.length === 0 || tabs.length !== panels.length) return;

  const select = (index: number, focus = true) => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i]!.hidden = !active;
    });
    if (focus) tabs[index]!.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      let next: number | null = null;
      if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
      if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = last;
      if (next !== null) { event.preventDefault(); select(next); }
    });
  });
  select(0, false);
});

/* ── Shop filtering ─────────────────────────────────────────────────────── */

/* Cards are already in the DOM; this only toggles visibility and keeps the URL
   in step, so a filtered view can be shared or reached with the back button.
   Without JavaScript the page still lists every kit, which is what matters. */
const shopGrid = document.getElementById('shop-grid');
const shopCount = document.getElementById('shop-count');

if (shopGrid && shopCount) {
  const cards = Array.from(shopGrid.querySelectorAll<HTMLElement>('.card'));
  const collectionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.filter[data-facet="cat"]'));
  const ageInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-facet="age"]'));
  const empty = document.getElementById('shop-empty');
  const params = new URLSearchParams(window.location.search);
  let activeCat = params.get('c') ?? 'all';
  let activeAge = params.get('a') ?? 'all';

  const applyFilters = (pushUrl: boolean) => {
    const band = ageInputs.find((input) => input.value === activeAge);
    const bandMin = Number(band?.dataset.min ?? 0);
    const bandMax = Number(band?.dataset.max ?? 99);
    let shown = 0;
    for (const card of cards) {
      const inCat = activeCat === 'all' || card.dataset.cat === activeCat;
      const inAge = activeAge === 'all' || (Number(card.dataset.min) <= bandMax && Number(card.dataset.max) >= bandMin);
      card.hidden = !(inCat && inAge);
      if (inCat && inAge) shown += 1;
    }
    collectionButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.value === activeCat)));
    ageInputs.forEach((input) => { input.checked = input.value === activeAge; });
    shopCount.textContent = `${shown} ${shown === 1 ? 'kit' : 'kits'}`;
    shopCount.hidden = shown === 0;
    if (empty) empty.hidden = shown > 0;
    if (pushUrl) {
      const next = new URLSearchParams();
      if (activeCat !== 'all') next.set('c', activeCat);
      if (activeAge !== 'all') next.set('a', activeAge);
      const query = next.toString();
      window.history.replaceState(null, '', query ? `/shop?${query}` : '/shop');
    }
  };

  collectionButtons.forEach((button) => button.addEventListener('click', () => {
    activeCat = button.dataset.value ?? 'all';
    applyFilters(true);
  }));
  ageInputs.forEach((input) => input.addEventListener('change', () => {
    activeAge = input.value;
    applyFilters(true);
  }));
  document.getElementById('filter-toggle')?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const panel = document.getElementById('age-panel');
    const open = !panel?.classList.contains('open');
    panel?.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('shop-sort')?.addEventListener('change', (event) => {
    const select = event.currentTarget as HTMLSelectElement;
    if (select.value === 'az') {
      cards.sort((a, b) => (a.querySelector('.card-title')?.textContent ?? '').localeCompare(b.querySelector('.card-title')?.textContent ?? ''));
      cards.forEach((card) => shopGrid.append(card));
    }
    applyFilters(false);
  });
  applyFilters(false);
}
