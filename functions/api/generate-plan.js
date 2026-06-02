/**
 * Cloudflare Pages Function — POST /api/generate-plan
 *
 * Env vars required (set in Cloudflare Pages dashboard):
 *   ANTHROPIC_API_KEY
 *   USDA_API_KEY  (free key from https://fdc.nal.usda.gov/api-key-signup.html — defaults to DEMO_KEY)
 *
 * External APIs used:
 *   USDA FoodData Central  — real nutritional data per food (free, no auth needed for DEMO_KEY)
 *   wger REST API          — real exercise database filtered by equipment (free, no auth needed)
 */

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
        "warmup": [{ "exercise": "string", "duration": "string", "notes": "string" }],
        "mainWorkout": [
          { "exercise": "string", "sets": number, "reps": "string", "rest": "string", "tempo": "string", "notes": "string" }
        ],
        "cooldown": [{ "exercise": "string", "duration": "string" }],
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
- All 7 days of the meal plan must be complete and varied`;

// ─── Main handler ────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { questionnaire, photoUrl } = await request.json();

    if (!questionnaire) {
      return new Response(JSON.stringify({ error: 'questionnaire is required' }), { status: 400, headers: corsHeaders });
    }

    // Fetch real data from USDA and wger in parallel — both are fire-and-forget;
    // if they fail we still generate the plan with Claude's own knowledge
    const [usdaFoods, wgerExercises] = await Promise.all([
      fetchUSDAFoods(questionnaire.dietaryStyle, env.USDA_API_KEY).catch(() => []),
      fetchWgerExercises(questionnaire.equipment, questionnaire.preferredWorkoutTypes).catch(() => []),
    ]);

    console.log(`USDA: ${usdaFoods.length} foods | wger: ${wgerExercises.length} exercises`);

    const userText = buildUserPrompt(questionnaire, photoUrl, usdaFoods, wgerExercises);

    // Build message — include photo for Claude vision if provided
    const messageContent = [];
    if (photoUrl) {
      messageContent.push({ type: 'image', source: { type: 'url', url: photoUrl } });
    }
    messageContent.push({ type: 'text', text: userText });

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Anthropic error:', err);
      return new Response(JSON.stringify({ error: 'AI generation failed', detail: err }), { status: 502, headers: corsHeaders });
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content?.[0]?.text || '';

    let plan;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || rawText.match(/(\{[\s\S]*\})/);
      plan = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);
    } catch {
      console.error('JSON parse error. Raw response:', rawText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: rawText.slice(0, 500) }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Attach data source metadata so the frontend can optionally show it
    plan._meta = {
      usdaFoodsUsed: usdaFoods.length,
      wgerExercisesUsed: wgerExercises.length,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ success: true, plan }), { headers: corsHeaders });
  } catch (err) {
    console.error('generate-plan error:', err);
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
