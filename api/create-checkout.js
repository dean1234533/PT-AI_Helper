/**
 * Cloudflare Pages Function — POST /api/create-checkout
 * Creates a Stripe Checkout session for the Pro plan.
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
    const { userId, userEmail, returnUrl } = req.body;
    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'userId and userEmail required' });
    }

    const base = returnUrl || process.env.STRIPE_PORTAL_RETURN_URL || 'https://yourptaihelper.com';

    const params = new URLSearchParams({
      mode: 'subscription',
      'payment_method_types[]': 'card',
      'line_items[0][price]': process.env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      'success_url': `${base}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${base}/pricing?cancelled=true`,
      'client_reference_id': userId,
      'customer_email': userEmail,
      'metadata[userId]': userId,
      'subscription_data[metadata][userId]': userId,
      // Allow promotion codes
      'allow_promotion_codes': 'true',
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Stripe error:', err);
      return res.status(502).json({ error: 'Stripe checkout failed', detail: err });
    }

    const session = await res.json();
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('create-checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
