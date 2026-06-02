/**
 * Cloudflare Pages Function — POST /api/send-plan
 *
 * Env vars required (set in Cloudflare Pages dashboard):
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL  (e.g. plans@yourdomain.com — must be verified in Resend)
 */

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function buildEmailHtml({ clientName, trainerNotes, plan }) {
  const n = plan?.nutritionPlan;
  const w = plan?.workoutPlan;

  const macroBar = (label, grams, pct, color) =>
    `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span style="font-weight:600;color:#374151">${label}</span>
        <span style="color:#6b7280">${grams}g (${pct}%)</span>
      </div>
      <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden">
        <div style="background:${color};height:100%;width:${pct}%;border-radius:4px"></div>
      </div>
    </div>`;

  const sectionTitle = (text) =>
    `<h2 style="font-size:20px;font-weight:700;color:#1e1b4b;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #e0e7ff">${text}</h2>`;

  // Build meal plan section
  let mealPlanHtml = '';
  if (n?.weeklyMealPlan) {
    DAYS.forEach((day) => {
      const d = n.weeklyMealPlan[day];
      if (!d) return;
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      const meals = [
        d.breakfast && `<div style="margin-bottom:8px"><strong style="color:#4f46e5;font-size:11px;text-transform:uppercase">Breakfast</strong><br/><span style="font-size:14px">${d.breakfast.name}</span> <span style="color:#9ca3af;font-size:12px">${d.breakfast.calories} kcal · ${d.breakfast.protein}g protein</span>${d.breakfast.description ? `<br/><span style="color:#6b7280;font-size:12px">${d.breakfast.description}</span>` : ''}</div>`,
        d.lunch && `<div style="margin-bottom:8px"><strong style="color:#4f46e5;font-size:11px;text-transform:uppercase">Lunch</strong><br/><span style="font-size:14px">${d.lunch.name}</span> <span style="color:#9ca3af;font-size:12px">${d.lunch.calories} kcal · ${d.lunch.protein}g protein</span></div>`,
        d.dinner && `<div style="margin-bottom:8px"><strong style="color:#4f46e5;font-size:11px;text-transform:uppercase">Dinner</strong><br/><span style="font-size:14px">${d.dinner.name}</span> <span style="color:#9ca3af;font-size:12px">${d.dinner.calories} kcal · ${d.dinner.protein}g protein</span></div>`,
        ...(d.snacks || []).map((s, i) => s ? `<div style="margin-bottom:4px"><strong style="color:#4f46e5;font-size:11px;text-transform:uppercase">Snack ${i + 1}</strong><br/><span style="font-size:14px">${s.name}</span> <span style="color:#9ca3af;font-size:12px">${s.calories} kcal</span></div>` : ''),
      ].filter(Boolean).join('');

      mealPlanHtml += `<div style="background:#f9fafb;border-radius:10px;padding:14px;margin-bottom:10px">
        <p style="font-weight:700;color:#1f2937;margin:0 0 10px;font-size:15px">${dayName}</p>
        ${meals}
      </div>`;
    });
  }

  // Build workout section
  let workoutHtml = '';
  if (w?.workouts?.length) {
    workoutHtml = w.workouts.map((wk) => {
      const exercises = wk.mainWorkout?.map((ex) =>
        `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 12px;font-size:13px;font-weight:500;color:#1f2937">${ex.exercise}</td>
          <td style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:center">${ex.sets}</td>
          <td style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:center">${ex.reps}</td>
          <td style="padding:8px 12px;font-size:13px;color:#9ca3af">${ex.rest || ''}</td>
          <td style="padding:8px 12px;font-size:12px;color:#9ca3af">${ex.notes || ''}</td>
        </tr>`
      ).join('') || '';

      return `<div style="background:#f9fafb;border-radius:10px;padding:14px;margin-bottom:12px">
        <p style="font-weight:700;color:#1f2937;margin:0 0 4px;font-size:15px">${wk.name}</p>
        <p style="color:#6b7280;font-size:13px;margin:0 0 12px">${wk.day} · ${wk.duration} minutes</p>
        ${exercises ? `<table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#e0e7ff;border-radius:6px">
            <th style="padding:8px 12px;text-align:left;color:#4f46e5;font-size:11px;text-transform:uppercase">Exercise</th>
            <th style="padding:8px 12px;text-align:center;color:#4f46e5;font-size:11px;text-transform:uppercase">Sets</th>
            <th style="padding:8px 12px;text-align:center;color:#4f46e5;font-size:11px;text-transform:uppercase">Reps</th>
            <th style="padding:8px 12px;text-align:left;color:#4f46e5;font-size:11px;text-transform:uppercase">Rest</th>
            <th style="padding:8px 12px;text-align:left;color:#4f46e5;font-size:11px;text-transform:uppercase">Notes</th>
          </tr></thead>
          <tbody>${exercises}</tbody>
        </table>` : ''}
      </div>`;
    }).join('');
  }

  const keyRulesHtml = n?.keyRules?.length
    ? n.keyRules.map((r, i) => `<li style="margin-bottom:8px;font-size:14px;color:#374151">${r}</li>`).join('')
    : '';

  const supplementsHtml = n?.supplements?.length
    ? n.supplements.map((s) => `<div style="background:#f5f3ff;border-radius:8px;padding:10px;margin-bottom:8px">
        <strong style="color:#7c3aed">${s.name}</strong> — ${s.dosage}<br/>
        <span style="font-size:12px;color:#6b7280">${s.reason}${s.timing ? ' | ' + s.timing : ''}</span>
      </div>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Personalised Fitness Plan</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:24px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);border-radius:16px;padding:32px;margin-bottom:24px;text-align:center">
      <div style="width:56px;height:56px;background:#6366f1;border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
        <span style="font-size:24px">🏋️</span>
      </div>
      <h1 style="color:white;font-size:26px;font-weight:800;margin:0 0 8px">Your Personalised Plan</h1>
      <p style="color:rgba(255,255,255,0.7);font-size:15px;margin:0">Prepared specifically for ${clientName}</p>
    </div>

    <!-- Main content -->
    <div style="background:white;border-radius:16px;padding:32px;margin-bottom:24px">

      ${plan?.clientSummary ? `<div style="background:#eef2ff;border-radius:10px;padding:16px;margin-bottom:24px">
        <p style="font-size:14px;color:#3730a3;line-height:1.6;margin:0">${plan.clientSummary}</p>
      </div>` : ''}

      <!-- Nutrition Plan -->
      ${sectionTitle('🥗 Nutrition Plan')}

      ${n ? `
      <!-- Calorie Target -->
      <div style="background:#fef3c7;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <p style="font-size:42px;font-weight:800;color:#d97706;margin:0">${n.dailyCalories?.toLocaleString()}</p>
        <p style="font-size:14px;color:#92400e;margin:4px 0 0">calories per day</p>
      </div>

      <!-- Macros -->
      <div style="margin-bottom:24px">
        ${macroBar('Protein', n.macros?.protein?.grams, n.macros?.protein?.percentage, '#4f46e5')}
        ${macroBar('Carbohydrates', n.macros?.carbs?.grams, n.macros?.carbs?.percentage, '#10b981')}
        ${macroBar('Fats', n.macros?.fats?.grams, n.macros?.fats?.percentage, '#f59e0b')}
      </div>

      ${n.hydration ? `<div style="background:#eff6ff;border-radius:10px;padding:14px;margin-bottom:20px;display:flex;gap:10px">
        <span style="font-size:20px">💧</span>
        <div><strong style="color:#1e40af">Hydration:</strong> <span style="color:#1d4ed8;font-size:14px">${n.hydration}</span></div>
      </div>` : ''}

      ${n.mealTiming ? `<div style="margin-bottom:20px">
        <h3 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 8px">Meal Timing</h3>
        <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0">${n.mealTiming}</p>
      </div>` : ''}

      <!-- 7-Day Meal Plan -->
      ${mealPlanHtml ? `<h3 style="font-size:17px;font-weight:700;color:#1f2937;margin:0 0 12px">7-Day Meal Plan</h3>${mealPlanHtml}` : ''}

      <!-- Key Rules -->
      ${keyRulesHtml ? `<h3 style="font-size:17px;font-weight:700;color:#1f2937;margin:20px 0 10px">Key Nutrition Rules</h3><ol style="padding-left:20px;margin:0">${keyRulesHtml}</ol>` : ''}

      <!-- Supplements -->
      ${supplementsHtml ? `<h3 style="font-size:17px;font-weight:700;color:#1f2937;margin:20px 0 10px">Supplements</h3>${supplementsHtml}` : ''}
      ` : ''}

      <!-- Workout Plan -->
      ${sectionTitle('🏋️ Workout Plan')}

      ${w?.weeklySchedule ? `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:20px">
        ${DAYS.map((d) => `<div style="background:${w.weeklySchedule[d] ? '#eef2ff' : '#f9fafb'};border-radius:8px;padding:8px 4px;text-align:center">
          <p style="font-size:10px;font-weight:700;color:#9ca3af;margin:0 0 4px;text-transform:uppercase">${d.slice(0,3)}</p>
          <p style="font-size:11px;color:${w.weeklySchedule[d] ? '#4338ca' : '#d1d5db'};margin:0;font-weight:600;line-height:1.3">${w.weeklySchedule[d] || 'Rest'}</p>
        </div>`).join('')}
      </div>` : ''}

      ${workoutHtml}

      ${w?.progressionGuide ? `<div style="background:#f0fdf4;border-radius:10px;padding:14px;margin-top:16px">
        <strong style="color:#166534">📈 Progression Guide:</strong>
        <p style="font-size:14px;color:#15803d;line-height:1.6;margin:6px 0 0">${w.progressionGuide}</p>
      </div>` : ''}

      ${w?.recoveryTips?.length ? `<div style="margin-top:20px">
        <h3 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 8px">Recovery Tips</h3>
        <ul style="padding-left:20px;margin:0">
          ${w.recoveryTips.map((t) => `<li style="font-size:14px;color:#4b5563;margin-bottom:6px">${t}</li>`).join('')}
        </ul>
      </div>` : ''}

      <!-- Trainer Notes -->
      ${trainerNotes ? `
      ${sectionTitle('📝 Notes from Your Trainer')}
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px">
        <p style="font-size:14px;color:#78350f;line-height:1.7;margin:0;white-space:pre-wrap">${trainerNotes}</p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px">
      <p style="font-size:12px;color:#9ca3af;margin:0">This plan was created with PT AI Helper. Please consult your trainer with any questions.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { clientEmail, clientName, trainerNotes, plan } = await request.json();

    if (!clientEmail || !plan) {
      return new Response(JSON.stringify({ error: 'clientEmail and plan are required' }), { status: 400, headers: corsHeaders });
    }

    const html = buildEmailHtml({ clientName, trainerNotes, plan });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'PT AI Helper <onboarding@resend.dev>',
        to: [clientEmail],
        subject: `Your Personalised Fitness & Nutrition Plan — ${clientName}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Email send failed', detail: err }), { status: 502, headers: corsHeaders });
    }

    const result = await resendRes.json();
    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: corsHeaders });
  } catch (err) {
    console.error('send-plan error:', err);
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
