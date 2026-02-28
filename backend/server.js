const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const cors = require('cors');
const path = require('path');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PRODUCTS = {
  premiumE5:       { priceId: 'price_1T4na5JO7rIXcjdNWM0IGRT6', priceIdEUR: 'price_1T5p2lJO7rIXcjdNQJ543yLx', name: 'Premium Paket E5',       priceSEK: 6499 },
  premiumE3:       { priceId: 'price_1T4nREJO7rIXcjdNWhOtgWBQ', priceIdEUR: 'price_1T5p92JO7rIXcjdNAe6S66rI', name: 'Premium Paket E3',       priceSEK: 4499 },
  secCloud:        { priceId: 'price_1T1bXsJO7rIXcjdNQD87DM9H', priceIdEUR: 'price_1T5pBNJO7rIXcjdNUSJZM6DM', name: 'Sec-Cloud Paket',        priceSEK: 2899 },
  ekonomiExtended: { priceId: 'price_1T1ahMJO7rIXcjdNwPQKK4eh', priceIdEUR: 'price_1T5pCUJO7rIXcjdNtfr1Sa0m', name: 'EKONOMI Paket Extended', priceSEK: 2299 },
  basExtended:     { priceId: 'price_1T1aWAJO7rIXcjdNoN7YANT6', priceIdEUR: 'price_1T5pDSJO7rIXcjdNqBmVlyaj', name: 'Bas Paket Extended',     priceSEK: 1799 },
};

function getNextBillingAnchor() {
  const now = new Date();
  let next28th = new Date(now.getFullYear(), now.getMonth(), 28);
  if (now.getDate() >= 28) {
    next28th = new Date(now.getFullYear(), now.getMonth() + 1, 28);
  }
  return Math.floor(next28th.getTime() / 1000);
}

function formatSEK(amount) {
  return amount.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
}

// ── Send confirmation email ───────────────────────────────────
async function sendConfirmationEmail({ to, name, productName, quantity, priceSEK, firstBillingDate, discountDescription, discountPercent, discountAmount }) {
  const subtotal      = priceSEK * quantity;
  const discountSEK   = discountPercent ? subtotal * (discountPercent / 100) : (discountAmount || 0);
  const discountedSub = Math.max(0, subtotal - discountSEK);
  const vat           = discountedSub * 0.25;
  const total         = discountedSub + vat;

  await resend.emails.send({
    from: 'InexPro <noreply@inexpro.net>',
    to,
    subject: '✓ Prenumerationsbekräftelse — InexPro',
    html: `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#131c36;padding:40px 40px 32px;text-align:center;">
          <img src="https://inexpro.net/wp-content/uploads/2026/02/New-inexpro-White-logo-no-background-3.png" alt="InexPro" style="height:64px;max-width:280px;object-fit:contain;margin-bottom:18px;display:block;margin-left:auto;margin-right:auto;"/>
          <div style="color:#ffffff;font-family:Mulish,Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Prenumerationsbekräftelse</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 0;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0e0f13;">Tack, ${name}!</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
            Din prenumeration är nu aktiverad. Inget har debiterats idag — din första faktura skickas <strong style="color:#0e0f13;">${firstBillingDate}</strong>.
          </p>

          <!-- Order summary -->
          <div style="background:#f8f9fc;border-radius:12px;padding:24px;margin-bottom:28px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:16px;">Prenumerationsdetaljer</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;padding-bottom:10px;">Paket</td>
                <td style="font-size:14px;color:#0e0f13;font-weight:600;text-align:right;padding-bottom:10px;">${productName}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6b7280;padding-bottom:10px;">Antal användare</td>
                <td style="font-size:14px;color:#0e0f13;font-weight:600;text-align:right;padding-bottom:10px;">${quantity} st</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6b7280;padding-bottom:10px;">Pris per användare (exkl. moms)</td>
                <td style="font-size:14px;color:#0e0f13;font-weight:600;text-align:right;padding-bottom:10px;">${formatSEK(priceSEK)}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6b7280;padding-bottom:10px;">Delsumma (exkl. moms)</td>
                <td style="font-size:14px;color:#0e0f13;font-weight:600;text-align:right;padding-bottom:10px;">${formatSEK(subtotal)}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6b7280;padding-bottom:10px;">Moms (25 %)</td>
                <td style="font-size:14px;color:#0e0f13;font-weight:600;text-align:right;padding-bottom:10px;">${formatSEK(vat)}</td>
              </tr>
              ${discountSEK > 0 ? `<tr>
                <td style="font-size:14px;color:#34d399;padding-bottom:10px;">Rabatt (${discountDescription})</td>
                <td style="font-size:14px;color:#34d399;font-weight:600;text-align:right;padding-bottom:10px;">-${formatSEK(discountSEK)}</td>
              </tr>` : ''}
              <tr style="border-top:1px solid #e5e7eb;">
                <td style="font-size:15px;color:#0e0f13;font-weight:700;padding-top:12px;">Totalt per månad (inkl. moms)</td>
                <td style="font-size:15px;color:#5b7fff;font-weight:700;text-align:right;padding-top:12px;">${formatSEK(total)}</td>
              </tr>
            </table>
          </div>

          <!-- Billing info -->
          <div style="background:#eff6ff;border-left:4px solid #5b7fff;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
            <div style="font-size:13px;color:#3b5bdb;font-weight:600;margin-bottom:4px;">📅 Faktureringsdatum</div>
            <div style="font-size:14px;color:#1e3a8a;line-height:1.5;">
              Första faktura: <strong>${firstBillingDate}</strong><br/>
              Därefter faktureras du den <strong>28:e varje månad</strong>.
            </div>
          </div>

          <!-- Links -->
          <div style="margin-bottom:28px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;">Viktig information</div>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="padding-bottom:8px;"><a href="https://inexpro.net/allmanna-villkor/" style="color:#5b7fff;text-decoration:none;font-size:14px;">📄 Tjänstevillkor</a></td></tr>
              <tr><td style="padding-bottom:8px;"><a href="https://inexpro.net/policy-retur/" style="color:#5b7fff;text-decoration:none;font-size:14px;">↩️ Återbetalningspolicy</a></td></tr>
              <tr><td><a href="https://inexpro.net/Integritetspolicy/" style="color:#5b7fff;text-decoration:none;font-size:14px;">🔒 Integritetspolicy</a></td></tr>
            </table>
          </div>
        </td></tr>

        <!-- Support -->
        <tr><td style="padding:0 40px 40px;">
          <div style="background:#f8f9fc;border-radius:12px;padding:20px 24px;">
            <div style="font-size:13px;font-weight:600;color:#0e0f13;margin-bottom:6px;">Behöver du hjälp?</div>
            <div style="font-size:13px;color:#6b7280;line-height:1.6;">
              Kontakta oss på <a href="mailto:info@inexpro.net" style="color:#5b7fff;text-decoration:none;">info@inexpro.net</a>
              eller besök <a href="https://inexpro.net" style="color:#5b7fff;text-decoration:none;">inexpro.net</a>
            </div>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fc;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#9ca3af;line-height:1.6;">
            © ${new Date().getFullYear()} InexPro. Alla rättigheter förbehållna.<br/>
            Du får detta mail eftersom du prenumererar på en InexPro-tjänst.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  // ── Onboarding / Welcome email ──────────────────────────────
  await resend.emails.send({
    from: 'InexPro <noreply@inexpro.net>',
    to,
    subject: 'Välkommen som partner — Starta din onboarding',
    html: `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#131c36;padding:40px 40px 32px;text-align:center;">
          <img src="https://inexpro.net/wp-content/uploads/2026/02/New-inexpro-White-logo-no-background-3.png" alt="InexPro" style="height:64px;max-width:280px;object-fit:contain;margin-bottom:18px;display:block;margin-left:auto;margin-right:auto;"/>
          <div style="color:#ffffff;font-family:Mulish,Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Välkommen som partner</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 0;">
          <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#0e0f13;">Välkommen som partner!</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">Ditt tjänstepaket är nu aktiverat och du är redo att komma igång.</p>
          <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.7;">Nästa steg är att skapa din Microsoft-plattform. Följ vår onboarding-process genom att klicka på knappen nedan och följ stegen i dokumenten.</p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
            <tr><td align="center">
              <a href="https://e.pcloud.link/publink/show?code=kZwbl3Z0gtf0SUvx8p08LItSrfig7jR2dHX#/filemanager?folder=22640137024"
                 style="display:inline-block;background:#5b7fff;color:#ffffff;font-family:Mulish,Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.02em;">
                Starta onboarding →
              </a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:28px;"/>
        </td></tr>

        <!-- Support -->
        <tr><td style="padding:0 40px 40px;">
          <div style="background:#f8f9fc;border-radius:12px;padding:20px 24px;">
            <div style="font-size:13px;font-weight:600;color:#0e0f13;margin-bottom:6px;">Har du frågor?</div>
            <div style="font-size:13px;color:#6b7280;line-height:1.6;">
              Kontakta oss på <a href="mailto:info@inexpro.net" style="color:#5b7fff;text-decoration:none;">info@inexpro.net</a>
              eller besök <a href="https://inexpro.net" style="color:#5b7fff;text-decoration:none;">inexpro.net</a>
            </div>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fc;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#9ca3af;line-height:1.6;">
            © ${new Date().getFullYear()} InexPro. Alla rättigheter förbehållna.<br/>
            Du får detta mail eftersom du nyligen aktiverat ett tjänstepaket hos InexPro.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ── POST /api/check-coupon ────────────────────────────────────
app.post('/api/check-coupon', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.json({ valid: false });
  try {
    const coupons = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    if (coupons.data.length === 0) return res.json({ valid: false });
    const promo = coupons.data[0];
    const coupon = promo.coupon;
    let description = '';
    if (coupon.percent_off) description = `${coupon.percent_off}% rabatt`;
    else if (coupon.amount_off) description = `${coupon.amount_off / 100} kr rabatt`;
    res.json({
      valid: true,
      couponId: promo.id,
      description,
      percentOff: coupon.percent_off || null,
      amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
    });
  } catch (err) {
    res.json({ valid: false });
  }
});

// ── POST /api/subscribe ───────────────────────────────────────
app.post('/api/subscribe', async (req, res) => {
  const { email, name, company, phone, country, currency, paymentMethodId, productKey, quantity, couponId } = req.body;

  if (!email || !name || !paymentMethodId || !productKey || !quantity) {
    return res.status(400).json({ error: 'Obligatoriska fält saknas.' });
  }

  const product = PRODUCTS[productKey];
  if (!product) return res.status(400).json({ error: 'Ogiltigt paket.' });

  try {
    const billingAnchor = getNextBillingAnchor();
    const firstBillingDate = new Date(billingAnchor * 1000).toLocaleDateString('sv-SE');

    const customer = await stripe.customers.create({
      email,
      name,
      phone: phone || undefined,
      address: country ? { country } : undefined,
      metadata: { company: company || '' },
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const selectedPriceId = (currency === 'EUR' && product.priceIdEUR) ? product.priceIdEUR : product.priceId;

    const subscriptionData = {
      customer: customer.id,
      items: [{ price: selectedPriceId, quantity: parseInt(quantity) }],
      billing_cycle_anchor: billingAnchor,
      trial_end: billingAnchor,
      proration_behavior: 'create_prorations',
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    };

    if (couponId) subscriptionData.discounts = [{ promotion_code: couponId }];

    const subscription = await stripe.subscriptions.create(subscriptionData);

    // Send confirmation email (non-fatal)
    try {
      // Fetch coupon details if applied
      let discountDescription = null, discountPercent = null, discountAmountVal = null;
      if (couponId) {
        try {
          const promos = await stripe.promotionCodes.list({ limit: 1 });
          const sub = await stripe.subscriptions.retrieve(subscription.id, { expand: ['discount.coupon'] });
          if (sub.discount && sub.discount.coupon) {
            const c = sub.discount.coupon;
            discountPercent = c.percent_off || null;
            discountAmountVal = c.amount_off ? c.amount_off / 100 : null;
            discountDescription = discountPercent ? `${discountPercent}% rabatt` : `${discountAmountVal} kr rabatt`;
          }
        } catch (e) { console.error('Discount fetch error:', e.message); }
      }
      await sendConfirmationEmail({
        to: email,
        name,
        productName: product.name,
        quantity: parseInt(quantity),
        priceSEK: product.priceSEK,
        firstBillingDate,
        discountDescription,
        discountPercent,
        discountAmount: discountAmountVal,
      });
    } catch (mailErr) {
      console.error('Mail error (non-fatal):', mailErr.message);
    }

    res.json({
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      firstBillingDate,
    });

  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
