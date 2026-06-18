/**
 * POST /api/create-checkout
 * Creates a Stripe Checkout session for the Pro plan.
 * Env vars: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_PORTAL_RETURN_URL
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function onRequestPost(ctx) {
  const env = ctx.env;
  try {
    const { userId, userEmail, returnUrl } = await ctx.request.json();
    if (!userId || !userEmail) return Response.json({ error: 'userId and userEmail required' }, { status: 400, headers: CORS });

    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) return Response.json({ error: 'Stripe is not configured on the server.' }, { status: 500, headers: CORS });
    if (!env.STRIPE_PRICE_ID.startsWith('price_')) return Response.json({ error: 'STRIPE_PRICE_ID must be a Stripe price ID that starts with price_.' }, { status: 500, headers: CORS });

    const base = returnUrl || env.STRIPE_PORTAL_RETURN_URL || 'https://pt-ai-helper.pages.dev';

    const params = new URLSearchParams({
      mode: 'subscription',
      'payment_method_types[]': 'card',
      'line_items[0][price]': env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      'success_url': `${base}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${base}/pricing?cancelled=true`,
      'client_reference_id': userId,
      'customer_email': userEmail,
      'metadata[userId]': userId,
      'subscription_data[metadata][userId]': userId,
      'allow_promotion_codes': 'true',
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      console.error('Stripe error:', errText);
      return Response.json({ error: 'Stripe checkout failed', detail: errText }, { status: 502, headers: CORS });
    }

    const session = await stripeRes.json();
    return Response.json({ url: session.url, sessionId: session.id }, { headers: CORS });
  } catch (err) {
    console.error('create-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
