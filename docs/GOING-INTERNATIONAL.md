# Selling worldwide

The store sold to Australia only. It now sells everywhere. This is what changed
in the code, and the one thing you have to do before the first overseas sale.

---

## ⚠️ Read this part first

**Selling digital products to consumers overseas creates a tax obligation in
their country, not yours — and for digital services there is usually no
threshold to cross first.**

This is the single most important consequence of the change, and it is not
optional or theoretical:

| Where | What applies |
|---|---|
| **European Union** | VAT is due in the customer's own member state, at their rate, **from the first sale**. There is no small-seller threshold for a non-EU business selling digital services to EU consumers. You register once through the **non-Union OSS** scheme and file one quarterly return. |
| **United Kingdom** | UK VAT at 20% on sales to UK consumers, **from the first sale**. No threshold for a non-UK business supplying digital services. |
| **Australia** | Unchanged. GST registration becomes compulsory at A$75,000 turnover in twelve months. Below that you charge no GST. |
| **Norway, Switzerland, and others** | Similar rules, lower or no thresholds. |
| **United States** | Varies by state. Most states need economic nexus (typically 100–200 transactions or US$100k) before you owe anything, so it is usually not immediate. |

**The site currently collects no tax on any sale, anywhere.** That was correct
while you sold only to Australia and were not GST-registered. It is not correct
for international sales. Every overseas sale made without collecting the right
VAT is a liability you are accruing personally — the tax is still owed, it just
has not been collected from the customer, so it comes out of your margin when
you register.

### What to do

1. **Turn on Stripe Tax** before you advertise outside Australia.
   Stripe dashboard → **Tax** → follow the setup. It determines the right rate
   from the customer's location, shows it at checkout and records it for filing.
   Roughly 0.5% per transaction where it calculates tax.
2. **Register where you are required to.** Stripe Tax shows you a *Monitoring*
   view that tells you where you have crossed a threshold or have an immediate
   obligation. EU: non-Union OSS. UK: HMRC VAT registration for overseas
   digital-services sellers.
3. **Talk to an accountant** who has handled cross-border digital sales. This
   is a 30-minute conversation that will save you a great deal.

The site is already built for this: `/terms` tells the customer that where tax
is required it is calculated and shown at checkout before they pay, which is
what Stripe Tax then does. Nothing in the code needs changing when you switch
it on — Checkout picks it up from your Stripe account settings.

Until you do switch it on, you are selling internationally tax-free, which is
fine for a handful of sales and a real problem at volume.

---

## What changed in the code

**The auto-refund is gone.** `finalisePaidOrder` used to check the billing
country and, if it was not `AU`, refund the payment, skip delivery and email the
buyer to say the store was Australia-only. An overseas customer was charged and
reversed within seconds. That block is removed and every paid order is now
fulfilled.

The billing country is still recorded on the order. It is the basis of any tax
determination and of how a dispute is assessed, so it is worth having even
though nothing gates on it.

`refunded_non_au` is still recognised as a status so any order refunded under
the old rule stays readable, but nothing produces it any more.

**The checkout gate is gone.** The cart had a required tick box reading *"I
confirm I am purchasing from Australia"*, and the client refused to submit
without it. Both are removed, replaced with a line telling international buyers
what they actually need to know: prices are in Australian dollars and their bank
converts.

**The legal pages are rewritten.** `/terms` and `/privacy` were written for an
Australian-only store. Both now cover worldwide sale — statutory rights
elsewhere, the EU and UK 14-day distance-selling right and why it ends when a
download begins, international data transfers and the GDPR bases for holding
what we hold, and which regulator to complain to in which region.

---

## Currency

Everything is priced and charged in **Australian dollars**, wherever the buyer
is. Their card issuer converts at its own rate.

This is deliberate. Multi-currency pricing means holding a price list per
currency, deciding whether to absorb or pass on exchange movement, and handling
refunds at a different rate from the sale. Charging in one currency avoids all
of it, and an overseas customer is used to seeing a foreign-currency line on
their statement.

The cart and the terms both say so plainly, so nobody is surprised.

If you do want local pricing later, Stripe supports presentment currencies and
the change is confined to `src/lib/pricing.ts` and the Checkout session.

---

## What to watch in the first month

- **Where orders are coming from.** `billing_country` is on every order:

  ```bash
  npx wrangler d1 execute raising-noble --remote \
    --command "SELECT billing_country, COUNT(*) FROM orders WHERE status='paid' GROUP BY billing_country ORDER BY 2 DESC"
  ```

  If the EU and UK are a meaningful share, registration is urgent rather than
  eventual.

- **Chargebacks.** Cross-border card payments are disputed more often than
  domestic ones. Your best defence is already built in: an emailed receipt, a
  download log, and a licence file stamped with the buyer's email and order
  number inside every ZIP.

- **Email deliverability.** Resend sends from the Tokyo region. That is fine
  worldwide, but keep the DMARC record in place — it matters more when your
  mail is crossing more borders.

- **Support hours.** A customer in London emailing at their lunchtime is
  emailing at your midnight. Say what your response time is and keep to it;
  `/terms` currently promises "a few days".
