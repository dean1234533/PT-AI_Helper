/**
 * GET /api/verify-checkout?session_id=xxx
 * Verifies a Stripe Checkout session and returns subscription details.
 * Env vars: STRIPE_SECRET_KEY
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function onRequestGet(ctx) {
  const env = ctx.env;
  try {
    const sessionId = new URL(ctx.request.url).searchParams.get('session_id');
    if (!sessionId) return Response.json({ error: 'session_id required' }, { status: 400, headers: CORS });

    if (!env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe is not configured on the server.' }, { status: 500, headers: CORS });

    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription&expand[]=customer`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
    );

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      return Response.json({ error: 'Stripe lookup failed', detail: errText }, { status: 502, headers: CORS });
    }

    const session = await stripeRes.json();

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return Response.json({ paid: false }, { headers: CORS });
    }

    return Response.json({
      paid: true,
      userId: session.client_reference_id || session.metadata?.userId,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    }, { headers: CORS });
  } catch (err) {
    console.error('verify-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
