/**
 * POST /api/send-invite
 * Emails a client a signup link so they can create their own linked account.
 * Stateless — the `clients` Firestore doc is created client-side by the trainer.
 * Env vars: RESEND_API_KEY, RESEND_FROM_EMAIL
 */

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildInviteEmail({ clientName, trainerName, inviteUrl }) {
  const name = escHtml(clientName);
  const trainer = escHtml(trainerName);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You've been invited</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:20px;padding:32px;margin-bottom:20px;text-align:center">
      <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px">💪</div>
      <h1 style="color:white;font-size:22px;font-weight:800;margin:0 0 6px">You've been invited</h1>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0">${trainer} wants to help you track your progress</p>
    </div>
    <div style="background:white;border-radius:20px;padding:28px;margin-bottom:20px">
      <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 20px">Hi ${name}, ${trainer} has invited you to set up your own account. You'll fill out a quick profile, get a personalised plan, and check in each week so ${trainer} can follow your progress.</p>
      <div style="text-align:center">
        <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:14px;letter-spacing:0.3px">
          Create My Account →
        </a>
        <p style="font-size:12px;color:#9ca3af;margin:12px 0 0">Or paste: <span style="color:#2563eb">${inviteUrl}</span></p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;padding:0 20px">Sent by ${trainer} via DB's AI.</p>
  </div>
</body>
</html>`;
}

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
    const { clientEmail, clientName, trainerName, inviteUrl } = await ctx.request.json();

    if (!clientEmail || !inviteUrl) {
      return Response.json({ error: 'clientEmail and inviteUrl are required' }, { status: 400, headers: CORS });
    }

    const resendKey = env.RESEND_API_KEY;
    if (!resendKey) return Response.json({ error: 'Email service is not configured on the server.' }, { status: 500, headers: CORS });

    const html = buildInviteEmail({
      clientName: clientName || 'there',
      trainerName: trainerName || 'Your trainer',
      inviteUrl,
    });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || "DB's AI <onboarding@resend.dev>",
        to: [clientEmail],
        subject: `${trainerName || 'Your trainer'} invited you to DB's AI 💪`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', errText);
      return Response.json({ error: 'Email send failed', detail: errText }, { status: 502, headers: CORS });
    }

    const result = await resendRes.json();
    return Response.json({ success: true, id: result.id }, { headers: CORS });
  } catch (err) {
    console.error('send-invite error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
