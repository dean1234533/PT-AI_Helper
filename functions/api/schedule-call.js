/**
 * Cloudflare Pages Function — POST /api/schedule-call
 * Sends a video call invitation email to the client.
 *
 * Env vars: RESEND_API_KEY, RESEND_FROM_EMAIL
 */

function buildCallInviteEmail({ clientName, trainerName, videoCallLink, callNotes }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
<div style="max-width:540px;margin:0 auto;padding:24px">

  <div style="background:linear-gradient(135deg,#5b21b6,#7c3aed);border-radius:20px;padding:32px;margin-bottom:20px;text-align:center">
    <div style="font-size:40px;margin-bottom:12px">📹</div>
    <h1 style="color:white;font-size:22px;font-weight:800;margin:0 0 6px">Your trainer wants to chat!</h1>
    <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0">${trainerName} has reviewed your check-in and is ready for a video call</p>
  </div>

  <div style="background:white;border-radius:20px;padding:28px;margin-bottom:20px">
    <p style="font-size:15px;color:#1f2937;font-weight:600;margin:0 0 10px">Hi ${clientName},</p>

    ${callNotes
      ? `<div style="background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:0 10px 10px 0;padding:14px;margin-bottom:20px">
          <p style="font-size:14px;color:#5b21b6;line-height:1.6;margin:0;font-style:italic">"${callNotes}"</p>
          <p style="font-size:12px;color:#7c3aed;margin:8px 0 0">— ${trainerName}</p>
        </div>`
      : `<p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 20px">
          I've read through your check-in responses and would love to connect with you on a video call to discuss your progress and next steps.
        </p>`
    }

    <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 24px">
      Click the button below to join our video call. If the time doesn't work for you, reply to this email and we'll find another slot.
    </p>

    <div style="text-align:center">
      <a href="${videoCallLink}" style="display:inline-block;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:white;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:14px;box-shadow:0 4px 14px rgba(124,58,237,0.3)">
        📹 Join Video Call
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:12px 0 0">Or copy this link: <span style="color:#7c3aed">${videoCallLink}</span></p>
    </div>
  </div>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px;margin-bottom:20px;text-align:center">
    <p style="font-size:13px;color:#166534;margin:0">💪 <strong>Keep up the great work</strong> — your trainer is here to support you every step of the way.</p>
  </div>

  <p style="text-align:center;font-size:12px;color:#9ca3af">PT AI Helper — Video Call System</p>
</div>
</body></html>`;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    const { clientEmail, clientName, trainerName, videoCallLink, callNotes } = await request.json();
    if (!clientEmail || !videoCallLink) {
      return new Response(JSON.stringify({ error: 'clientEmail and videoCallLink are required' }), { status: 400, headers: corsHeaders });
    }

    const html = buildCallInviteEmail({ clientName, trainerName, videoCallLink, callNotes });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'PT AI Helper <onboarding@resend.dev>',
        to: [clientEmail],
        subject: `${trainerName} wants to jump on a video call with you 📹`,
        html,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err) {
    console.error('schedule-call error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
