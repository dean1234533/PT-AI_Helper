/**
 * POST /api/generate-plan
 * Generates a personalised fitness and nutrition plan using AI.
 * Env vars: CEREBRAS_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, MISTRAL_API_KEY,
 *           GITHUB_MODELS_TOKEN, USDA_API_KEY (optional)
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

const FALLTHROUGH_CODES = new Set([429, 402, 503, 529]);

async function callProvider(provider, key, systemPrompt, userText, photoUrl, cfEnv) {
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

  if (provider.jsonMode && !useVision) {
    body.response_format = { type: 'json_object' };
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };

  if (provider.name === 'OpenRouter') {
    headers['HTTP-Referer'] = cfEnv.APP_URL || 'https://dbs-app.pages.dev';
    headers['X-Title'] = "DB's AI";
  }

  const fetchRes = await fetch(provider.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55000),
  });

  return { fetchRes, model, providerName: provider.name };
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

const NUTRIENT_IDS = { calories: 1008, protein: 1003, carbs: 1005, fat: 1004, fiber: 1079 };

// ─── wger: equipment name → API ID mapping ──────────────────────────────────

const WGER_EQUIPMENT_MAP = {
  'Barbell & Plates': 1,
  'Dumbbells': 3,
  'Kettlebells': 9,
  'Pull-up Bar': 6,
  'Cable Machine': 10,
  'Full Commercial Gym': null,
  'Bodyweight Only': 7,
  'TRX / Suspension': 7,
  'Resistance Bands': 4,
};

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
  const equipmentIds = (equipment || [])
    .map((e) => WGER_EQUIPMENT_MAP[e])
    .filter((id) => id !== null && id !== undefined);

  const wantsWeightTraining =
    !preferredWorkoutTypes?.length ||
    preferredWorkoutTypes.some((t) => ['Weight Training', 'CrossFit', 'Circuit Training', 'HIIT'].includes(t));

  if (!wantsWeightTraining) return [];

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

  const seen = new Set();
  return exercises.filter((ex) => {
    if (seen.has(ex.name)) return false;
    seen.add(ex.name);
    return true;
  });
}

// ─── Build prompt ─────────────────────────────────────────────────────────

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

  if (wgerExercises.length > 0) {
    lines.push(
      '=== REAL EXERCISE DATABASE FROM WGER (filtered by client equipment) ===',
      'Prioritise selecting exercises from this list where suitable. You may add others if needed:',
      ''
    );
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

// ─── Cloudflare Pages Function handler ───────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function onRequestPost(ctx) {
  const cfEnv = ctx.env;
  const getenv = (name) => cfEnv[name] || cfEnv[`VITE_${name}`];

  try {
    const { questionnaire, photoUrl } = await ctx.request.json();

    if (!questionnaire) {
      return Response.json({ error: 'questionnaire is required' }, { status: 400, headers: CORS });
    }

    // Validate photoUrl is a Firebase Storage URL only
    if (photoUrl && !/^https:\/\/firebasestorage\.googleapis\.com\//.test(photoUrl)) {
      return Response.json({ error: 'Invalid photoUrl' }, { status: 400, headers: CORS });
    }

    // Clamp free-text fields to prevent prompt injection
    const FREE_TEXT_LIMIT = 500;
    const freeTextFields = ['additionalNotes', 'injuries', 'medications', 'foodsToExclude', 'fitnessGoals'];
    for (const field of freeTextFields) {
      if (questionnaire[field]) questionnaire[field] = String(questionnaire[field]).slice(0, FREE_TEXT_LIMIT);
    }

    const [usdaFoods, wgerExercises] = await Promise.all([
      fetchUSDAFoods(questionnaire.dietaryStyle, getenv('USDA_API_KEY')).catch(() => []),
      fetchWgerExercises(questionnaire.equipment, questionnaire.preferredWorkoutTypes).catch(() => []),
    ]);

    console.log(`USDA: ${usdaFoods.length} foods | wger: ${wgerExercises.length} exercises`);

    const userText = buildUserPrompt(questionnaire, photoUrl, usdaFoods, wgerExercises);

    let rawText = null;
    let usedProvider = null;
    const errors = [];

    for (const provider of PROVIDERS) {
      const key = getenv(provider.envKey);
      if (!key) {
        console.log(`Skipping ${provider.name} — ${provider.envKey} not configured`);
        continue;
      }

      try {
        console.log(`Trying ${provider.name}…`);
        const { fetchRes, model, providerName } = await callProvider(provider, key, SYSTEM_PROMPT, userText, photoUrl, cfEnv);

        if (FALLTHROUGH_CODES.has(fetchRes.status)) {
          const body = await fetchRes.text();
          console.warn(`${providerName} rate-limited (${fetchRes.status}): ${body.slice(0, 200)}`);
          errors.push(`${providerName}: ${fetchRes.status}`);
          continue;
        }

        if (!fetchRes.ok) {
          const body = await fetchRes.text();
          console.error(`${providerName} error (${fetchRes.status}): ${body.slice(0, 300)}`);
          errors.push(`${providerName}: ${fetchRes.status} — ${body.slice(0, 150)}`);
          continue;
        }

        const data = await fetchRes.json();
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
      return Response.json({
        error: 'Our AI service is currently unavailable. Please try again in a few minutes.',
      }, { status: 502, headers: CORS });
    }

    let plan;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || rawText.match(/(\{[\s\S]*\})/);
      plan = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);
    } catch {
      console.error('JSON parse error. Raw response:', rawText.slice(0, 500));
      return Response.json({ error: 'Something went wrong while generating your plan. Please try again.' }, { status: 500, headers: CORS });
    }

    plan._meta = {
      usdaFoodsUsed: usdaFoods.length,
      wgerExercisesUsed: wgerExercises.length,
      generatedAt: new Date().toISOString(),
      provider: usedProvider,
    };

    return Response.json({ success: true, plan }, { headers: CORS });
  } catch (err) {
    console.error('generate-plan error:', err);
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500, headers: CORS });
  }
}
