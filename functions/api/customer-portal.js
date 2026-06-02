/**
 * Cloudflare Pages Function — POST /api/customer-portal
 * Creates a Stripe Customer Portal session so Pro subscribers can
 * manage/cancel their subscription without contacting support.
 *
 * Env vars: STRIPE_SECRET_KEY, STRIPE_PORTAL_RETURN_URL
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { stripeCustomerId, returnUrl } = await request.json();
    if (!stripeCustomerId) {
      return new Response(JSON.stringify({ error: 'stripeCustomerId required' }), { status: 400, headers: corsHeaders });
    }

    const params = new URLSearchParams({
      customer: stripeCustomerId,
      return_url: returnUrl || env.STRIPE_PORTAL_RETURN_URL || 'https://yourptaihelper.com/dashboard',
    });

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: 'Portal session failed', detail: err }), { status: 502, headers: corsHeaders });
    }

    const portal = await res.json();
    return new Response(JSON.stringify({ url: portal.url }), { headers: corsHeaders });
  } catch (err) {
    console.error('customer-portal error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
