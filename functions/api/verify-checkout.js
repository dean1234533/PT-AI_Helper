/**
 * Cloudflare Pages Function — GET /api/verify-checkout?session_id=xxx
 * Verifies a Stripe Checkout session and returns subscription details.
 * The React app calls this on return from Stripe and then updates Firestore directly.
 *
 * Env vars: STRIPE_SECRET_KEY
 */

export async function onRequestGet(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: corsHeaders });
    }

    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription&expand[]=customer`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: 'Stripe lookup failed', detail: err }), { status: 502, headers: corsHeaders });
    }

    const session = await res.json();

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return new Response(JSON.stringify({ paid: false }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      paid: true,
      userId: session.client_reference_id || session.metadata?.userId,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    }), { headers: corsHeaders });
  } catch (err) {
    console.error('verify-checkout error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
