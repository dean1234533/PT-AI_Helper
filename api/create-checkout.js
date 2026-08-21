/**
 * Cloudflare Pages Function — POST /api/create-checkout
 * Creates a Stripe Checkout session for Personal or PT Pro.
 *
 * Env vars: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_PORTAL_RETURN_URL
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  
  try {
    const { plan = 'pt_pro', userId, userEmail } = req.body;
    if (!['personal', 'pt_pro'].includes(plan)) return res.status(400).json({ error: 'Invalid plan.' });
    const priceId = plan === 'personal'
      ? process.env.STRIPE_PERSONAL_PRICE_ID
      : (process.env.STRIPE_PT_PRO_PRICE_ID || process.env.STRIPE_PRICE_ID);
    if (!process.env.STRIPE_SECRET_KEY || !priceId) return res.status(500).json({ error: 'Stripe is not configured for this plan.' });
    if (!priceId.startsWith('price_')) return res.status(500).json({ error: 'The Stripe price ID is invalid.' });

    const base = (process.env.APP_URL || 'https://app.dbworkouts.co.uk').replace(/\/$/, '');

    const params = new URLSearchParams({
      mode: 'subscription',
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${base}/${userId ? 'dashboard?upgraded=true' : 'register?subscription=success'}&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${base}/pricing?cancelled=true`,
      'metadata[plan]': plan,
      'allow_promotion_codes': 'true',
    });
    if (userId) {
      params.set('client_reference_id', userId);
      params.set('metadata[userId]', userId);
      params.set('subscription_data[metadata][userId]', userId);
    }
    if (userEmail) params.set('customer_email', userEmail);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.text();
      console.error('Stripe error:', err);
      return res.status(502).json({ error: 'Stripe checkout failed', detail: err });
    }

    const session = await stripeRes.json();
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('create-checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
