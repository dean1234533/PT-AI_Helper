/**
 * POST /api/customer-portal
 * Creates a Stripe Customer Portal session.
 * Env vars: STRIPE_SECRET_KEY, STRIPE_PORTAL_RETURN_URL
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
    const { stripeCustomerId, returnUrl } = await ctx.request.json();
    if (!stripeCustomerId) return Response.json({ error: 'stripeCustomerId required' }, { status: 400, headers: CORS });
    if (!env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe is not configured on the server.' }, { status: 500, headers: CORS });

    const params = new URLSearchParams({
      customer: stripeCustomerId,
      return_url: returnUrl || env.STRIPE_PORTAL_RETURN_URL || 'https://pt-ai-helper.pages.dev/#/dashboard',
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      return Response.json({ error: 'Portal session failed', detail: errText }, { status: 502, headers: CORS });
    }

    const portal = await stripeRes.json();
    return Response.json({ url: portal.url }, { headers: CORS });
  } catch (err) {
    console.error('customer-portal error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
