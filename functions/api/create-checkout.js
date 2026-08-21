/**
 * POST /api/create-checkout
 * Creates a Stripe Checkout session for Personal or PT Pro.
 * Env vars: STRIPE_SECRET_KEY, STRIPE_PERSONAL_PRICE_ID,
 * STRIPE_PT_PRO_PRICE_ID (or legacy STRIPE_PRICE_ID), APP_URL
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
    const { plan = 'pt_pro', userId, userEmail } = await ctx.request.json();
    if (!['personal', 'pt_pro'].includes(plan)) return Response.json({ error: 'Invalid plan.' }, { status: 400, headers: CORS });

    const priceId = plan === 'personal'
      ? env.STRIPE_PERSONAL_PRICE_ID
      : (env.STRIPE_PT_PRO_PRICE_ID || env.STRIPE_PRICE_ID);
    if (!env.STRIPE_SECRET_KEY || !priceId) return Response.json({ error: 'Stripe is not configured for this plan.' }, { status: 500, headers: CORS });
    if (!priceId.startsWith('price_')) return Response.json({ error: 'The Stripe price ID is invalid.' }, { status: 500, headers: CORS });

    const base = (env.APP_URL || 'https://app.dbworkouts.co.uk').replace(/\/$/, '');

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
