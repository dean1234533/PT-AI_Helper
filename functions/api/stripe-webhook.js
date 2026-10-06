/**
 * POST /api/stripe-webhook
 * Stripe webhook — the one place that actually records whether a user paid.
 * Without this, nothing in Firestore ever reflected subscription status, so
 * a user could create an account via /register?plan=X, abandon Stripe
 * Checkout, and use the whole app for free (ProtectedRoute never checked
 * payment — see pendingPlan/subscriptionStatus gating added alongside this).
 *
 * Configure in the Stripe dashboard: Developers → Webhooks → Add endpoint
 *   URL: https://app.dbworkouts.co.uk/api/stripe-webhook
 *   Events: checkout.session.completed, customer.subscription.updated,
 *           customer.subscription.deleted
 * Then set the signing secret: STRIPE_WEBHOOK_SECRET
 *
 * Env vars: STRIPE_WEBHOOK_SECRET
 */

import { firestorePatch, toFirestoreFields } from '../_shared/firestore.js';

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k, v];
    })
  );
  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret.trim()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Guard against stale events — Stripe recommends rejecting timestamps far in the past.
  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  if (age > 300) return false;

  return computedSig === parts.v1;
}

async function setSubscriptionStatus(userId, fields, env) {
  if (!userId) return;
  await firestorePatch(
    `users/${userId}/data/profile`,
    toFirestoreFields(fields),
    Object.keys(fields),
    env
  );
}

const SUBSCRIPTION_STATUS_MAP = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete: 'pending',
  incomplete_expired: 'canceled',
  paused: 'canceled',
};

export async function onRequestPost(ctx) {
  const env = ctx.env;
  try {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET not configured');
      return new Response('Webhook not configured', { status: 500 });
    }

    const rawBody = await ctx.request.text();
    const sigHeader = ctx.request.headers.get('Stripe-Signature');
    const valid = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      if (userId && session.mode === 'subscription') {
        await setSubscriptionStatus(userId, {
          subscriptionStatus: 'active',
          plan: session.metadata?.plan || null,
          pendingPlan: null,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null,
        }, env);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;
      const status = event.type === 'customer.subscription.deleted'
        ? 'canceled'
        : (SUBSCRIPTION_STATUS_MAP[subscription.status] || 'pending');
      if (userId) {
        const fields = { subscriptionStatus: status };
        if (status === 'active') fields.pendingPlan = null;
        await setSubscriptionStatus(userId, fields, env);
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('stripe-webhook error:', err);
    return new Response('Webhook handler error', { status: 500 });
  }
}
