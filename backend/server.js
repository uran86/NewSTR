const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

const PRODUCTS = {
  premiumE5:       { priceId: 'price_1T4na5JO7rIXcjdNWM0IGRT6', name: 'Premium Paket E5' },
  premiumE3:       { priceId: 'price_1T4nREJO7rIXcjdNWhOtgWBQ', name: 'Premium Paket E3' },
  secCloud:        { priceId: 'price_1T1bXsJO7rIXcjdNQD87DM9H', name: 'Sec-Cloud Paket' },
  ekonomiExtended: { priceId: 'price_1T1ahMJO7rIXcjdNwPQKK4eh', name: 'EKONOMI Paket Extended' },
  basExtended:     { priceId: 'price_1T1aWAJO7rIXcjdNoN7YANT6', name: 'Bas Paket Extended' },
  testProd1:       { priceId: 'price_1T1cHmJO7rIXcjdNY5fSYKKA', name: 'test-prod1' },
};

function getNextBillingAnchor() {
  const now = new Date();
  let next28th = new Date(now.getFullYear(), now.getMonth(), 28);
  if (now.getDate() >= 28) {
    next28th = new Date(now.getFullYear(), now.getMonth() + 1, 28);
  }
  return Math.floor(next28th.getTime() / 1000);
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
    res.json({ valid: true, couponId: promo.id, description });
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

    const customer = await stripe.customers.create({
      email,
      name,
      phone: phone || undefined,
      address: country ? { country } : undefined,
      metadata: { company: company || '' },
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscriptionData = {
      currency: (currency || 'sek').toLowerCase(),
      customer: customer.id,
      items: [{ price: product.priceId, quantity: parseInt(quantity) }],
      billing_cycle_anchor: billingAnchor,
      trial_end: billingAnchor,
      proration_behavior: 'none',
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    };

    if (couponId) subscriptionData.discounts = [{ promotion_code: couponId }];

    const subscription = await stripe.subscriptions.create(subscriptionData);

    res.json({
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      firstBillingDate: new Date(billingAnchor * 1000).toLocaleDateString('sv-SE'),
    });

  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
