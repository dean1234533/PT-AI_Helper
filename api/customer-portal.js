/**
 * Cloudflare Pages Function — POST /api/customer-portal
 * Creates a Stripe Customer Portal session so Pro subscribers can
 * manage/cancel their subscription without contacting support.
 *
 * Env vars: STRIPE_SECRET_KEY, STRIPE_PORTAL_RETURN_URL
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
    const { stripeCustomerId, returnUrl } = req.body;
    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'stripeCustomerId required' });
    }

    const params = new URLSearchParams({
      customer: stripeCustomerId,
      return_url: returnUrl || process.env.STRIPE_PORTAL_RETURN_URL || 'https://yourptaihelper.com/dashboard',
    });

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      return res.status(502).json({ error: 'Portal session failed', detail: err });
    }

    const portal = await res.json();
    return res.status(200).json({ url: portal.url });
  } catch (err) {
    console.error('customer-portal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
