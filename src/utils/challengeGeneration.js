// AI challenge suggestions and "stuck for today?" nudges — mirrors the
// prompt-builder pattern in planGeneration.js so the trainer-side "Suggest
// with AI" button and the client-side "Stuck for today?" button both reuse
// the same useGemini().callAI() the rest of the app already uses (routes
// through /api/admin-ai for admin/managed-client accounts, or the user's
// own key otherwise — see GeminiContext.jsx).

import { parseAIJson } from './json';

export function buildChallengeSuggestionsPrompt(profile, analysis, { currentPlan, recentCheckIn, existingTitles } = {}) {
  return `
You are an expert personal trainer suggesting accountability challenges for ONE specific client, based on everything you know about them below. Suggestions must clearly connect to THIS client's actual goal, plan and recent check-in — not generic fitness advice that could apply to anyone.

Client profile:
- Goal: ${profile?.goal || 'General fitness'}
- Fitness level: ${profile?.fitnessLevel || 'Not specified'}
- Body type: ${analysis?.bodyType || 'Not specified'}
- Dietary style: ${profile?.dietaryStyle || 'Not specified'}
- Training days/week: ${profile?.trainingDaysPerWeek || 'Not specified'}

Current plan:
- Workout split focus: ${currentPlan?.workoutPlan?.focus || 'Not specified'}
- Daily calorie target: ${currentPlan?.nutritionPlan?.dailyTargetCalories || 'Not specified'}

Most recent check-in${recentCheckIn ? '' : ' (none yet)'}:${recentCheckIn ? `
- Workout adherence: ${recentCheckIn.adherenceWorkout || 'Not specified'}
- Nutrition adherence: ${recentCheckIn.adherenceNutrition || 'Not specified'}
- Energy (1-10): ${recentCheckIn.energy ?? 'Not specified'}
- What was challenging: "${recentCheckIn.notesChallenging || 'None noted'}"` : ''}
${existingTitles?.length ? `\nThis client already has these challenges running or archived — do not suggest anything overlapping with them: ${existingTitles.join(', ')}.` : ''}

Suggest exactly 3 short, achievable accountability challenges that specifically address the weak point above (e.g. low adherence, a stated struggle, or a gap the current plan doesn't cover) — not just restating the goal. Vary the type — mix daily habits and weekly-count habits, and mix workout/nutrition/lifestyle where it fits. Avoid defaulting to the same generic picks (10k steps, water, workouts-per-week) unless they genuinely fit a struggle mentioned above.

Session reference (ignore this line, it's just to vary your output between requests): ${Date.now()}

Return ONLY a valid JSON array, no markdown, no preamble:
[
  {
    "title": "Short punchy title",
    "description": "One sentence on why this helps their specific goal",
    "type": "daily",
    "targetPerWeek": null,
    "logType": "tick",
    "numberTarget": null,
    "unit": null,
    "freezesPerMonth": 1,
    "rewards": [
      { "atDay": 10, "title": "Small reward idea" },
      { "atDay": 25, "title": "Bigger reward idea" }
    ]
  }
]

Rules:
- "type" is exactly "daily" or "x_per_week". If "x_per_week", set targetPerWeek to a realistic integer (e.g. 3) and leave freezesPerMonth relevant to daily-type habits only (still include a sensible default).
- "logType" is exactly one of "tick", "number", "note", "photo". Use "number" with numberTarget + unit for measurable habits (e.g. 10000 steps), "tick" for simple yes/no habits, "note" for reflection habits, "photo" for visual habits.
- Rewards should be realistic PT rewards (free session, free assessment, a small gift, a shoutout) at 2 milestones appropriate to the challenge length.
- Return ONLY the JSON array.
`;
}

export async function generateChallengeSuggestions(profile, analysis, callAI, context) {
  const text = await callAI(buildChallengeSuggestionsPrompt(profile, analysis, context));
  return parseAIJson(text);
}

export function buildStuckForTodayPrompt(challenge) {
  return `
You are a supportive personal trainer. A client is stuck on today's accountability challenge and needs one quick, specific suggestion to complete it right now.

Challenge: "${challenge.title}" — ${challenge.description || ''}
Type: ${challenge.type === 'x_per_week' ? `${challenge.targetPerWeek}x per week` : 'daily'}
${challenge.numberTarget ? `Target: ${challenge.numberTarget} ${challenge.unit || ''}` : ''}

Give ONE quick, specific, doable-in-the-next-10-minutes suggestion to help them complete today's log. Be warm and brief — 2-3 sentences max, no preamble, no markdown, just the suggestion text.
`;
}

export async function generateStuckForTodaySuggestion(challenge, callAI) {
  return (await callAI(buildStuckForTodayPrompt(challenge))).trim();
}
