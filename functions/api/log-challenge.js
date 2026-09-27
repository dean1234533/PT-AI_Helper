/**
 * POST /api/log-challenge
 * The client's one real write path for a challenge log. Clients technically
 * have a narrow direct-write path too (see firestore.rules), but going
 * through here is what actually enforces "today" in the client's own
 * timezone and does the streak/freeze/reward math server-side — the whole
 * point being a client can never fake a streak by editing the stats field
 * on the challenge doc directly (rules block that entirely; only the PT and
 * this service-account-authenticated function can write it).
 *
 * Body: { challengeId, value?, note?, photoUrl? } — value/note/photoUrl
 *       depend on the challenge's logType (tick needs none, number needs
 *       value, note needs note, photo needs photoUrl — already uploaded to
 *       Storage client-side under storage.rules before calling this).
 * Header: Authorization: Bearer <client's ID token>
 * Env vars: FIREBASE_API_KEY, FIREBASE_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON, RESEND_API_KEY, RESEND_FROM_EMAIL
 */

import { firestoreGet, firestorePatch, toFirestoreFields } from '../_shared/firestore.js';
import { sendPushToUid } from '../_shared/fcm.js';
import {
  getLocalDateString,
  applyDailyLog,
  applyWeeklyLog,
  getNewlyHitRewards,
} from '../_shared/streakLogic.js';

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

function docFields(doc) {
  const f = doc?.fields || {};
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('arrayValue' in v) out[k] = (v.arrayValue.values || []).map((item) => docFields({ fields: { v: item } }).v ?? mapItem(item));
    else if ('nullValue' in v) out[k] = null;
    else out[k] = v;
  }
  return out;
}
function mapItem(item) {
  if ('mapValue' in item) return docFields({ fields: item.mapValue.fields || {} });
  if ('stringValue' in item) return item.stringValue;
  if ('integerValue' in item) return Number(item.integerValue);
  if ('booleanValue' in item) return item.booleanValue;
  return null;
}

async function buildRewardEmail({ trainerName, clientName, reward }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">
    <p style="font-size:22px;margin:0 0 6px">🏆</p>
    <h1 style="color:white;font-size:20px;font-weight:800;margin:0 0 4px">${clientName} hit a streak milestone!</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0">Day ${reward.atDay} reward unlocked</p>
  </div>
  <div style="background:white;border-radius:16px;padding:24px;text-align:center">
    <p style="font-size:14px;color:#4b5563;margin:0 0 16px">Hi ${trainerName}, <strong>${clientName}</strong> just reached a ${reward.atDay}-day streak and earned:</p>
    <div style="background:#faf5ff;border-radius:12px;padding:16px">
      <p style="font-size:16px;color:#7c3aed;font-weight:700;margin:0">${reward.title}</p>
      ${reward.description ? `<p style="font-size:13px;color:#6b7280;margin:6px 0 0">${reward.description}</p>` : ''}
    </div>
    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0">Log in to mark this reward as given.</p>
  </div>
</div>
</body></html>`;
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

    const { challengeId, value, note, photoUrl } = await ctx.request.json();
    if (!challengeId) return Response.json({ error: 'challengeId is required' }, { status: 400, headers: CORS });

    const challengeDoc = await firestoreGet(`challenges/${challengeId}`, env);
    if (!challengeDoc) return Response.json({ error: 'Challenge not found' }, { status: 404, headers: CORS });
    const challenge = docFields(challengeDoc);

    if (challenge.clientId !== caller.uid) {
      return Response.json({ error: 'This is not your challenge.' }, { status: 403, headers: CORS });
    }
    if (challenge.status !== 'active') {
      return Response.json({ error: 'This challenge is not active.' }, { status: 400, headers: CORS });
    }

    if (challenge.logType === 'number' && (value === undefined || value === null || isNaN(Number(value)))) {
      return Response.json({ error: 'A numeric value is required for this challenge.' }, { status: 400, headers: CORS });
    }
    if (challenge.logType === 'note' && !note?.trim()) {
      return Response.json({ error: 'A note is required for this challenge.' }, { status: 400, headers: CORS });
    }
    if (challenge.logType === 'photo' && !photoUrl) {
      return Response.json({ error: 'A photo is required for this challenge.' }, { status: 400, headers: CORS });
    }

    const timezoneDoc = await firestoreGet(`users/${caller.uid}/data/profile`, env).catch(() => null);
    const timezone = docFields(timezoneDoc)?.timezone || 'Europe/London';
    const logDate = getLocalDateString(timezone);

    // "number" logs accumulate through the day (e.g. log 200ml, then 500ml,
    // then 300ml as you actually drink it) rather than replacing a single
    // guessed total — so a fresh submission adds to whatever's already
    // logged for today instead of overwriting it.
    let numberTotal = Number(value) || 0;
    if (challenge.logType === 'number') {
      const existingLogDoc = await firestoreGet(`challenges/${challengeId}/logs/${logDate}`, env).catch(() => null);
      const existingValue = Number(docFields(existingLogDoc)?.value) || 0;
      numberTotal = existingValue + (Number(value) || 0);
    }

    // For the "number" log type, only counts towards streak progress if it
    // meets the target — but is still recorded either way (e.g. a partial
    // step count still shows on the heatmap, just not as a streak day).
    const meetsTarget = challenge.logType !== 'number' || !challenge.numberTarget || numberTotal >= challenge.numberTarget;

    const logFields = {
      clientId: caller.uid,
      date: logDate,
      createdAt: new Date().toISOString(),
    };
    if (challenge.logType === 'number') logFields.value = numberTotal;
    else if (value !== undefined && value !== null) logFields.value = Number(value);
    if (note) logFields.note = note;
    if (photoUrl) logFields.photoUrl = photoUrl;
    logFields.meetsTarget = meetsTarget;

    let statsUpdate = {};
    let usedFreeze = false;

    if (meetsTarget) {
      if (challenge.type === 'x_per_week') {
        const result = applyWeeklyLog(
          {
            currentWeekStart: challenge.currentWeekStart || null,
            currentWeekCount: challenge.currentWeekCount || 0,
            currentStreak: challenge.currentStreak || 0,
            longestStreak: challenge.longestStreak || 0,
            lastLoggedDate: challenge.lastLoggedDate || null,
          },
          Number(challenge.targetPerWeek) || 1,
          logDate
        );
        statsUpdate = result;
      } else {
        const result = applyDailyLog(
          {
            currentStreak: challenge.currentStreak || 0,
            longestStreak: challenge.longestStreak || 0,
            lastLoggedDate: challenge.lastLoggedDate || null,
            freezesUsedThisMonth: challenge.freezesUsedThisMonth || 0,
            freezesResetMonth: challenge.freezesResetMonth || null,
          },
          Number(challenge.freezesPerMonth) || 0,
          logDate
        );
        usedFreeze = result.usedFreeze;
        delete result.usedFreeze;
        statsUpdate = result;
      }
    }

    logFields.usedFreeze = usedFreeze;

    await firestorePatch(
      `challenges/${challengeId}/logs/${logDate}`,
      toFirestoreFields(logFields),
      Object.keys(logFields),
      env
    );

    // totalLogs counts every attempt (engagement), whether or not it met
    // target — a below-target log still shows the PT their client showed up,
    // distinct from a streak day (which requires meeting target).
    statsUpdate.totalLogs = (challenge.totalLogs || 0) + 1;
    await firestorePatch(`challenges/${challengeId}`, toFirestoreFields(statsUpdate), Object.keys(statsUpdate), env);

    let newlyHitRewards = [];
    if (meetsTarget) {
      const newStreak = statsUpdate.currentStreak ?? challenge.currentStreak ?? 0;
      newlyHitRewards = getNewlyHitRewards(challenge.rewards, newStreak);
    }

    if (newlyHitRewards.length && challenge.ptId) {
      for (const reward of newlyHitRewards) {
        await sendPushToUid(challenge.ptId, {
          title: `${challenge.clientName || 'A client'} hit ${reward.atDay} days! 🏆`,
          body: `Reward: ${reward.title}`,
          url: '/clients',
        }, env).catch((err) => console.error('Push error:', err.message));

        if (env.RESEND_API_KEY && challenge.ptEmail) {
          const html = await buildRewardEmail({
            trainerName: challenge.trainerName || 'Coach',
            clientName: challenge.clientName || 'Your client',
            reward,
          });
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: env.RESEND_FROM_EMAIL || "DB's Workouts <onboarding@resend.dev>",
              to: [challenge.ptEmail],
              subject: `${challenge.clientName || 'A client'} hit a streak milestone! 🏆`,
              html,
            }),
          }).catch((err) => console.error('Reward email error:', err.message));
        }
      }
    }

    return Response.json({
      success: true,
      logDate,
      meetsTarget,
      stats: statsUpdate,
      newlyHitRewards,
    }, { headers: CORS });
  } catch (err) {
    console.error('log-challenge error:', err);
    return Response.json({ error: err.message || 'Failed to log challenge.' }, { status: 500, headers: CORS });
  }
}
