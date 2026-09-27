// AI challenge suggestions and "stuck for today?" nudges — mirrors the
// prompt-builder pattern in planGeneration.js so the trainer-side "Suggest
// with AI" button and the client-side "Stuck for today?" button both reuse
// the same useGemini().callAI() the rest of the app already uses (routes
// through /api/admin-ai for admin/managed-client accounts, or the user's
// own key otherwise — see GeminiContext.jsx).

import { parseAIJson } from './json';

export function buildChallengeSuggestionsPrompt(profile, analysis) {
  return `
You are an expert personal trainer suggesting accountability challenges for a client, based on their profile and current plan.

Client profile:
- Goal: ${profile?.goal || 'General fitness'}
- Fitness level: ${profile?.fitnessLevel || 'Not specified'}
- Body type: ${analysis?.bodyType || 'Not specified'}
- Dietary style: ${profile?.dietaryStyle || 'Not specified'}
- Training days/week: ${profile?.trainingDaysPerWeek || 'Not specified'}

Suggest exactly 3 short, achievable accountability challenges that would keep this specific client on track between sessions. Vary the type — mix daily habits and weekly-count habits, and mix workout/nutrition/lifestyle where it fits their goal.

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

export async function generateChallengeSuggestions(profile, analysis, callAI) {
  const text = await callAI(buildChallengeSuggestionsPrompt(profile, analysis));
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
