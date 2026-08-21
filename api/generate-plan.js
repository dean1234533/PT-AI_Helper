/**
 * Cloudflare Pages Function — POST /api/generate-plan
 *
 * Tries each AI provider in order; moves to next on 429/402/503 (rate-limit / quota).
 * Set these in the Cloudflare Pages dashboard (Settings → Environment Variables):
 *
 *   CEREBRAS_API_KEY     → cerebras.ai/free
 *   GROQ_API_KEY         → console.groq.com
 *   OPENROUTER_API_KEY   → openrouter.ai
 *   MISTRAL_API_KEY      → console.mistral.ai
 *   GITHUB_MODELS_TOKEN  → github.com → Settings → Developer settings → Personal access tokens
 *   USDA_API_KEY         → fdc.nal.usda.gov/api-key-signup.html (optional, falls back to DEMO_KEY)
 *
 * External APIs (free, no key needed):
 *   USDA FoodData Central — verified nutritional data per food
 *   wger REST API         — exercise database filtered by client equipment
 */

// ─── AI provider cascade ─────────────────────────────────────────────────────

const PROVIDERS = [
  {
    name: 'Cerebras',
    envKey: 'CEREBRAS_API_KEY',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama-3.3-70b',
    visionModel: null,
    maxTokens: 8192,
    jsonMode: true,
  },
  {
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    visionModel: 'llama-3.2-11b-vision-preview',
    maxTokens: 8192,
    jsonMode: true,
  },
  {
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/free',
    visionModel: 'meta-llama/llama-3.2-11b-vision-instruct:free',
    maxTokens: 8192,
    jsonMode: false,
  },
  {
    name: 'Mistral',
    envKey: 'MISTRAL_API_KEY',
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'open-mistral-7b',
    visionModel: null,
    maxTokens: 8192,
    jsonMode: false,
  },
  {
    name: 'GitHub Models',
    envKey: 'GITHUB_MODELS_TOKEN',
    url: 'https://models.inference.ai.azure.com/chat/completions',
    model: 'meta-llama-3.1-70b-instruct',
    visionModel: null,
    maxTokens: 4096,
    jsonMode: false,
  },
];

// Fall through to the next provider on these status codes
const FALLTHROUGH_CODES = new Set([429, 402, 503, 529]);

function env(name) {
  return process.env[name] || process.env[`VITE_${name}`];
}

async function callProvider(provider, key, systemPrompt, userText, photoUrl) {
  const useVision = !!(photoUrl && provider.visionModel);
  const model = useVision ? provider.visionModel : provider.model;

  const userContent = useVision
    ? [
        { type: 'image_url', image_url: { url: photoUrl } },
        { type: 'text', text: userText },
      ]
    : userText;

  const body = {
    model,
    max_tokens: provider.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };

  // JSON mode enforces valid JSON output; disable for vision models (not universally supported)
  if (provider.jsonMode && !useVision) {
    body.response_format = { type: 'json_object' };
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };

  // OpenRouter requires these headers to identify the app
  if (provider.name === 'OpenRouter') {
    headers['HTTP-Referer'] = env('APP_URL') || 'https://app.dbworkouts.co.uk';
    headers['X-Title'] = 'PT AI Helper';
  }

  const res = await fetch(provider.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55000),
  });

  return { res, model, providerName: provider.name };
}

// ─── USDA: food queries per dietary style ───────────────────────────────────

const FOOD_QUERIES_BY_DIET = {
  default: ['chicken breast raw', 'brown rice cooked', 'oats rolled dry', 'eggs whole raw', 'sweet potato raw', 'broccoli raw', 'banana raw', 'olive oil'],
  'Vegetarian': ['eggs whole raw', 'Greek yogurt plain', 'cottage cheese', 'brown rice cooked', 'oats rolled dry', 'lentils cooked', 'chickpeas cooked', 'broccoli raw', 'banana raw'],
  'Vegan': ['tofu firm raw', 'lentils cooked', 'chickpeas cooked', 'tempeh', 'quinoa cooked', 'brown rice cooked', 'oats rolled dry', 'almonds', 'broccoli raw', 'banana raw'],
  'Pescatarian': ['salmon atlantic raw', 'tuna canned water', 'shrimp raw', 'brown rice cooked', 'oats rolled dry', 'eggs whole raw', 'sweet potato raw', 'broccoli raw'],
  'Keto / Low Carb': ['beef ground 80 lean raw', 'salmon atlantic raw', 'eggs whole raw', 'avocado raw', 'cheddar cheese', 'almonds', 'spinach raw', 'cream cheese'],
  'Paleo': ['beef ground 85 lean raw', 'chicken breast raw', 'salmon atlantic raw', 'sweet potato raw', 'almonds', 'eggs whole raw', 'broccoli raw', 'avocado raw'],
};

// USDA nutrient IDs we care about
const NUTRIENT_IDS = { calories: 1008, protein: 1003, carbs: 1005, fat: 1004, fiber: 1079 };

// ─── wger: equipment name → API ID mapping ──────────────────────────────────

const WGER_EQUIPMENT_MAP = {
  'Barbell & Plates': 1,
  'Dumbbells': 3,
  'Kettlebells': 9,
  'Pull-up Bar': 6,
  'Cable Machine': 10,
  'Full Commercial Gym': null, // fetch all categories
  'Bodyweight Only': 7,
  'TRX / Suspension': 7,
  'Resistance Bands': 4, // closest match: gym mat / body weight category
};

// wger muscle group category IDs
const WGER_CATEGORIES = { abs: 10, arms: 8, back: 12, chest: 11, legs: 9, shoulders: 13 };

// ─── Fetch USDA nutritional data ────────────────────────────────────────────

async function fetchUSDAFoods(dietaryStyle, apiKey) {
  const queries = FOOD_QUERIES_BY_DIET[dietaryStyle] || FOOD_QUERIES_BY_DIET.default;
  const key = apiKey || 'DEMO_KEY';

  const results = await Promise.allSettled(
    queries.map(async (query) => {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=1&dataType=SR%20Legacy,Foundation&api_key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json();
      const food = data.foods?.[0];
      if (!food) return null;

      // Extract key nutrients per 100g
      const getNutrient = (id) => food.foodNutrients?.find((n) => n.nutrientId === id)?.value ?? null;

      return {
        name: food.description,
        per100g: {
          calories: getNutrient(NUTRIENT_IDS.calories),
          protein: getNutrient(NUTRIENT_IDS.protein),
          carbs: getNutrient(NUTRIENT_IDS.carbs),
          fat: getNutrient(NUTRIENT_IDS.fat),
          fiber: getNutrient(NUTRIENT_IDS.fiber),
        },
      };
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
}

// ─── Fetch wger exercises ────────────────────────────────────────────────────

async function fetchWgerExercises(equipment, preferredWorkoutTypes) {
  // Map client equipment to wger IDs
  const equipmentIds = (equipment || [])
    .map((e) => WGER_EQUIPMENT_MAP[e])
    .filter((id) => id !== null && id !== undefined);

  // Decide which muscle group categories to fetch based on preferences
  const wantsWeightTraining =
    !preferredWorkoutTypes?.length ||
    preferredWorkoutTypes.some((t) => ['Weight Training', 'CrossFit', 'Circuit Training', 'HIIT'].includes(t));

  if (!wantsWeightTraining) return [];

  // Fetch exercises for each major muscle group, filtered by available equipment
  const categoriesToFetch = Object.values(WGER_CATEGORIES);
  const eqParam = equipmentIds.length ? `&equipment=${equipmentIds[0]}` : '';

  const results = await Promise.allSettled(
    categoriesToFetch.map(async (catId) => {
      const url = `https://wger.de/api/v2/exerciseinfo/?format=json&language=2&category=${catId}${eqParam}&limit=6`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((ex) => ({
        name: ex.translations?.find((t) => t.language === 2)?.name || ex.name || 'Exercise',
        category: ex.category?.name || 'General',
        equipment: ex.equipment?.map((e) => e.name).join(', ') || 'None',
        description: ex.translations?.find((t) => t.language === 2)?.description?.replace(/<[^>]*>/g, '').slice(0, 120) || '',
      }));
    })
  );

  const exercises = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((ex) => ex.name && ex.name !== 'Exercise');

  // Deduplicate by name
  const seen = new Set();
  return exercises.filter((ex) => {
    if (seen.has(ex.name)) return false;
    seen.add(ex.name);
    return true;
  });
}

// ─── Build Claude prompt ─────────────────────────────────────────────────────

function buildUserPrompt(questionnaire, photoUrl, usdaFoods, wgerExercises) {
  const q = questionnaire;

  const lines = [
    '=== CLIENT ASSESSMENT DATA ===',
    '',
    `Name: ${q.clientName || 'Client'}`,
    `Age: ${q.age || 'Not specified'}`,
    `Gender: ${q.gender || 'Not specified'}`,
    `Height: ${q.heightCm ? q.heightCm + ' cm' : 'Not specified'}`,
    `Current weight: ${q.weightKg ? q.weightKg + ' kg' : 'Not specified'}`,
    `Goal weight: ${q.goalWeightKg ? q.goalWeightKg + ' kg' : 'Not specified'}`,
    '',
    '--- GOALS ---',
    `Primary goal: ${q.primaryGoal || 'Not specified'}`,
    `Secondary goal: ${q.secondaryGoal || 'None'}`,
    `Timeline: ${q.timeline || 'Not specified'}`,
    '',
    '--- HEALTH ---',
    `Medical conditions: ${q.medicalConditions?.length ? q.medicalConditions.join(', ') : 'None'}${q.medicalOther ? '; ' + q.medicalOther : ''}`,
    `Injuries / limitations: ${q.injuries || 'None'}`,
    `Allergies / intolerances: ${q.allergies?.length ? q.allergies.join(', ') : 'None'}${q.allergyOther ? '; ' + q.allergyOther : ''}`,
    `Medications: ${q.medications || 'None'}`,
    '',
    '--- LIFESTYLE ---',
    `Activity level: ${q.activityLevel || 'Not specified'}`,
    `Occupation: ${q.occupation || 'Not specified'}`,
    `Sleep: ${q.sleepHours || 'Not specified'} hours/night`,
    `Stress level: ${q.stressLevel || 'Not specified'}/10`,
    `Smoking: ${q.smokingStatus || 'Not specified'}`,
    `Alcohol: ${q.alcoholFrequency || 'Not specified'}`,
    '',
    '--- DIET & NUTRITION ---',
    `Dietary style: ${q.dietaryStyle || 'Not specified'}`,
    `Meals per day preference: ${q.mealsPerDay || 'Not specified'}`,
    `Foods to exclude: ${q.foodsToExclude || 'None specified'}`,
    `Cooking skill: ${q.cookingSkill || 'Not specified'}`,
    `Cooking time available: ${q.cookingTime || 'Not specified'}`,
    `Food budget: ${q.foodBudget || 'Not specified'}`,
    '',
    '--- FITNESS ---',
    `Fitness level: ${q.fitnessLevel || 'Not specified'}`,
    `Equipment available: ${q.equipment?.length ? q.equipment.join(', ') : 'Not specified'}`,
    `Workout days per week: ${q.workoutDaysPerWeek || 'Not specified'}`,
    `Session duration: ${q.sessionDuration || 'Not specified'} minutes`,
    `Preferred workout types: ${q.preferredWorkoutTypes?.length ? q.preferredWorkoutTypes.join(', ') : 'Not specified'}`,
    `Exercises to avoid: ${q.exercisesToAvoid || 'None'}`,
  ];

  if (q.additionalNotes) {
    lines.push('', '--- ADDITIONAL NOTES FROM TRAINER ---', q.additionalNotes);
  }

  if (photoUrl) {
    lines.push('', '--- PHOTO ---', `A body composition photo has been provided. Please use it to further personalise your assessment of the client's current physique, body fat estimation, and adjust calorie and macro targets accordingly.`);
  }

  // ── Inject real USDA nutritional data ──
  if (usdaFoods.length > 0) {
    lines.push(
      '',
      '=== REAL NUTRITIONAL DATA FROM USDA FOODDATA CENTRAL ===',
      'Use these verified values (per 100g) when calculating and referencing these foods in the meal plan:',
      ''
    );
    usdaFoods.forEach((food) => {
      const n = food.per100g;
      const parts = [
        n.calories != null && `${n.calories} kcal`,
        n.protein != null && `${n.protein}g protein`,
        n.carbs != null && `${n.carbs}g carbs`,
        n.fat != null && `${n.fat}g fat`,
        n.fiber != null && `${n.fiber}g fibre`,
      ].filter(Boolean);
      lines.push(`• ${food.name}: ${parts.join(' | ')}`);
    });
    lines.push('');
  }

  // ── Inject real wger exercise data ──
  if (wgerExercises.length > 0) {
    lines.push(
      '=== REAL EXERCISE DATABASE FROM WGER (filtered by client equipment) ===',
      'Prioritise selecting exercises from this list where suitable. You may add others if needed:',
      ''
    );
    // Group by category
    const byCategory = {};
    wgerExercises.forEach((ex) => {
      if (!byCategory[ex.category]) byCategory[ex.category] = [];
      byCategory[ex.category].push(ex);
    });
    Object.entries(byCategory).forEach(([cat, exs]) => {
      lines.push(`${cat}:`);
      exs.slice(0, 8).forEach((ex) => {
        lines.push(`  • ${ex.name}${ex.equipment ? ' [' + ex.equipment + ']' : ''}${ex.description ? ' — ' + ex.description : ''}`);
      });
      lines.push('');
    });
  }

  lines.push('=== END OF CLIENT DATA ===', '', 'Please generate a complete, highly personalised plan for this client in the exact JSON format specified. Use the real USDA nutritional values and wger exercises provided above to ensure accuracy.');

  return lines.join('\n');
}

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert personal trainer (CSCS, NASM certified) and registered dietitian with 15+ years of experience. You create evidence-based, highly personalised nutrition and workout plans.

You will be provided with verified USDA nutritional data and real exercises from the wger exercise database. Use these to ensure your plan has accurate calorie/macro values and appropriate exercises for the client's available equipment.

CRITICAL: You MUST respond with a single valid JSON object ONLY. No markdown, no text before or after the JSON. The JSON must follow this exact schema:

{
  "clientSummary": "string — 3-4 sentence personalised assessment of this client's situation and approach",
  "nutritionPlan": {
    "dailyCalories": number,
    "macros": {
      "protein": { "grams": number, "percentage": number },
      "carbs": { "grams": number, "percentage": number },
      "fats": { "grams": number, "percentage": number }
    },
    "hydration": "string — specific daily water target with context",
    "mealTiming": "string — when to eat and why, tailored to their schedule/goals",
    "weeklyMealPlan": {
      "monday": {
        "breakfast": { "name": "string", "calories": number, "protein": number, "description": "string" },
        "lunch": { "name": "string", "calories": number, "protein": number, "description": "string" },
        "dinner": { "name": "string", "calories": number, "protein": number, "description": "string" },
        "snacks": [{ "name": "string", "calories": number, "description": "string" }]
      },
      "tuesday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snacks": [] },
      "wednesday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snacks": [] },
      "thursday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snacks": [] },
      "friday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snacks": [] },
      "saturday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snacks": [] },
      "sunday": { "breakfast": {}, "lunch": {}, "dinner": {}, "snacks": [] }
    },
    "shoppingList": {
      "proteins": ["string"],
      "vegetables": ["string"],
      "fruits": ["string"],
      "grains": ["string"],
      "dairy": ["string"],
      "fats": ["string"],
      "other": ["string"]
    },
    "supplements": [{ "name": "string", "reason": "string", "dosage": "string", "timing": "string" }],
    "keyRules": ["string — max 8 rules, highly specific to this client"],
    "notes": "string — any extra nutrition guidance"
  },
  "workoutPlan": {
    "weeklySchedule": {
      "monday": "string or null",
      "tuesday": "string or null",
      "wednesday": "string or null",
      "thursday": "string or null",
      "friday": "string or null",
      "saturday": "string or null",
      "sunday": "string or null"
    },
    "workouts": [
      {
        "day": "string",
        "name": "string",
        "duration": number,
        "warmup": [
          { "exercise": "string — exact movement, never vague", "duration": "string — exact time", "reps": "string — reps if relevant", "notes": "string — coaching cue" }
        ],
        "mainWorkout": [
          { "exercise": "string", "sets": number, "reps": "string", "rest": "string", "tempo": "string", "targetMuscles": "string", "notes": "string", "progressionNote": "string" }
        ],
        "cooldown": [
          { "exercise": "string — exact stretch/drill, never vague", "duration": "string — exact time", "notes": "string — coaching cue" }
        ],
        "cardio": "string or null"
      }
    ],
    "progressionGuide": "string — how to increase difficulty week by week",
    "recoveryTips": ["string — max 5 tips"],
    "notes": "string"
  },
  "keyInsights": ["string — max 5 key observations about this client that shaped the plan"],
  "trainerNotes": ""
}

Rules:
- Use the Mifflin-St Jeor equation to calculate TDEE, then apply the appropriate calorie surplus/deficit for their goal
- Use the real USDA values provided to back up your calorie calculations for meal items
- Prioritise exercises from the wger database provided — they are already filtered for this client's equipment
- Every meal and exercise MUST respect dietary restrictions, allergies, injuries, and available equipment
- For beginners, start conservatively with weights and volume
- Provide realistic meal options that match their cooking skill and time availability
- All 7 days of the meal plan must be complete and varied
- Every training day must be a complete session, not a summary
- Every training day requires at least 7 mainWorkout items unless it is a rest day
- Every warmup must contain exactly 5 specific timed movements totalling 8-12 minutes
- Every cooldown must contain exactly 5 specific timed stretches or breathing drills totalling 5-8 minutes
- Never write vague items such as "5 minutes stretching", "dynamic warmup", "mobility", "core work", or "do cardio"; name the exact movement and exact duration/reps
- Timed bodyweight/circuit work is valid and should be written precisely, e.g. "Bodyweight squats — 30 sec", "Sit-ups — 20 sec", "Mountain climbers — 30 sec", "Hip flexor stretch — 45 sec each side"
- Meal descriptions must include specific portions, cooking/prep guidance, and why the meal supports the goal`;

// ─── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { questionnaire, photoUrl } = req.body;

    if (!questionnaire) {
      return res.status(400).json({ error: 'questionnaire is required' });
    }

    // Fetch real food and exercise data in parallel — failures are non-fatal
    const [usdaFoods, wgerExercises] = await Promise.all([
      fetchUSDAFoods(questionnaire.dietaryStyle, env('USDA_API_KEY')).catch(() => []),
      fetchWgerExercises(questionnaire.equipment, questionnaire.preferredWorkoutTypes).catch(() => []),
    ]);

    console.log(`USDA: ${usdaFoods.length} foods | wger: ${wgerExercises.length} exercises`);

    const userText = buildUserPrompt(questionnaire, photoUrl, usdaFoods, wgerExercises);

    // ── Provider cascade ─────────────────────────────────────────────────────
    let rawText = null;
    let usedProvider = null;
    const errors = [];

    for (const provider of PROVIDERS) {
      const key = env(provider.envKey);
      if (!key) {
        console.log(`Skipping ${provider.name} — ${provider.envKey} not configured`);
        continue;
      }

      try {
        console.log(`Trying ${provider.name}…`);
        const { res, model, providerName } = await callProvider(provider, key, SYSTEM_PROMPT, userText, photoUrl);

        if (FALLTHROUGH_CODES.has(res.status)) {
          const body = await res.text();
          console.warn(`${providerName} rate-limited (${res.status}): ${body.slice(0, 200)}`);
          errors.push(`${providerName}: ${res.status}`);
          continue;
        }

        if (!res.ok) {
          const body = await res.text();
          console.error(`${providerName} error (${res.status}): ${body.slice(0, 300)}`);
          errors.push(`${providerName}: ${res.status} — ${body.slice(0, 150)}`);
          continue;
        }

        const data = await res.json();
        // OpenRouter returns HTTP 200 with an error body when a model has no endpoints
        if (data?.error) {
          console.warn(`${providerName} responded with error body:`, JSON.stringify(data.error).slice(0, 200));
          errors.push(`${providerName}: model unavailable`);
          continue;
        }
        rawText = data.choices?.[0]?.message?.content || '';
        if (!rawText) {
          errors.push(`${providerName}: empty response`);
          continue;
        }
        usedProvider = `${providerName} / ${model}`;
        console.log(`Generated with ${usedProvider} (${rawText.length} chars)`);
        break;

      } catch (fetchErr) {
        console.error(`${provider.name} fetch failed:`, fetchErr.message);
        errors.push(`${provider.name}: ${fetchErr.message}`);
      }
    }

    if (!rawText) {
      return res.status(502).json({
        error: 'Our AI service is currently unavailable. Please try again in a few minutes.',
      });
    }

    let plan;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || rawText.match(/(\{[\s\S]*\})/);
      plan = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);
    } catch {
      console.error('JSON parse error. Raw response:', rawText.slice(0, 500));
      return res.status(500).json({ error: 'Something went wrong while generating your plan. Please try again.' });
    }

    plan._meta = {
      usdaFoodsUsed: usdaFoods.length,
      wgerExercisesUsed: wgerExercises.length,
      generatedAt: new Date().toISOString(),
      provider: usedProvider,
    };

    return res.status(200).json({ success: true, plan });
  } catch (err) {
    console.error('generate-plan error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again in a moment.' });
  }
}
