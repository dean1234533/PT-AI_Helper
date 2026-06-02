/**
 * Cloudflare Pages Function — POST /api/create-checkout
 * Creates a Stripe Checkout session for the Pro plan.
 *
 * Env vars: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_PORTAL_RETURN_URL
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { userId, userEmail, returnUrl } = await request.json();
    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ error: 'userId and userEmail required' }), { status: 400, headers: corsHeaders });
    }

    const base = returnUrl || env.STRIPE_PORTAL_RETURN_URL || 'https://yourptaihelper.com';

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
      // Allow promotion codes
      'allow_promotion_codes': 'true',
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Stripe error:', err);
      return new Response(JSON.stringify({ error: 'Stripe checkout failed', detail: err }), { status: 502, headers: corsHeaders });
    }

    const session = await res.json();
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), { headers: corsHeaders });
  } catch (err) {
    console.error('create-checkout error:', err);
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
