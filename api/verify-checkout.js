/**
 * Cloudflare Pages Function — GET /api/verify-checkout?session_id=xxx
 * Verifies a Stripe Checkout session and returns subscription details.
 * The React app calls this on return from Stripe and then updates Firestore directly.
 *
 * Env vars: STRIPE_SECRET_KEY
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) {
      return res.status(400).json({ error: 'session_id required' });
    }

    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription&expand[]=customer`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return res.status(502).json({ error: 'Stripe lookup failed', detail: err });
    }

    const session = await res.json();

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(200).json({ paid: false });
    }

    return res.status(200).json({
      paid: true,
      userId: session.client_reference_id || session.metadata?.userId,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    });
  } catch (err) {
    console.error('verify-checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
