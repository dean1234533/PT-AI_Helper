/**
 * POST /api/link-subscription
 * Called once, right after a brand-new account is created from the
 * pay-before-signup flow (see Register.jsx's subscription=success branch).
 * At checkout time there was no Firebase account yet, so the Stripe
 * subscription has no metadata.userId — without this, a later
 * customer.subscription.updated/.deleted webhook (renewal, cancellation,
 * failed payment) would have no way to find which user to update.
 *
 * Body: { sessionId, userId }
 * Header: Authorization: Bearer <the new user's own ID token>
 * Env vars: STRIPE_SECRET_KEY, FIREBASE_API_KEY
 */

function getenv(name, env) {
  return env[name] || env[`VITE_${name}`];
}

async function verifyCaller(idToken, env) {
  const webApiKey = getenv('FIREBASE_API_KEY', env);
  if (!idToken || !webApiKey) return null;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const account = data.users?.[0];
  if (!account?.localId) return null;
  return { uid: account.localId };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function onRequestPost(ctx) {
  const env = ctx.env;
  try {
    const authHeader = ctx.request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const caller = await verifyCaller(idToken, env);
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });

    const { sessionId, userId } = await ctx.request.json();
    // Only the account being linked can link its own subscription.
    if (!sessionId || !userId || userId !== caller.uid) {
      return Response.json({ error: 'Invalid request' }, { status: 400, headers: CORS });
    }
    if (!env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe is not configured on the server.' }, { status: 500, headers: CORS });

    const sessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY.trim()}` },
    });
    if (!sessionRes.ok) return Response.json({ error: 'Could not look up checkout session.' }, { status: 502, headers: CORS });
    const session = await sessionRes.json();

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return Response.json({ error: 'That session was not paid.' }, { status: 400, headers: CORS });
    }

    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return Response.json({ error: 'No subscription on this session.' }, { status: 400, headers: CORS });

    const linkRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY.trim()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ 'metadata[userId]': userId }).toString(),
    });
    if (!linkRes.ok) {
      const errText = await linkRes.text();
      console.error('link-subscription: failed to tag subscription metadata:', errText);
      return Response.json({ error: 'Could not link subscription' }, { status: 502, headers: CORS });
    }

    return Response.json({ success: true, stripeSubscriptionId: subscriptionId }, { headers: CORS });
  } catch (err) {
    console.error('link-subscription error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
