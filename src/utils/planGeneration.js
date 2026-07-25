// Shared AI prompt builders + plan-patch logic for body analysis, full 7-day
// plan generation, and weekly check-in adjustments. Single source of truth so
// the trainer-driven flow (Clients.jsx) and the original solo/self-service
// flow (BodyAnalysis.jsx, MyPlan.jsx, CheckIn.jsx) never drift apart.

import { parseAIJson } from './json';
import { findPlanQualityIssues, repairThinPlan } from './planQuality';

export function buildAnalysisPrompt(profile) {
  const hasPhoto = !!profile.photoBase64;
  return `
You are an expert personal trainer and fitness scientist. Analyze the user's details and determine their body type (Ectomorph, Mesomorph, Endomorph, or a Combination).

User Profile:
- Name: ${profile.name}
- Age: ${profile.age} years old
- Gender: ${profile.gender}
- Weight: ${profile.weight} kg
- Height: ${profile.height} cm
- Main Goal: ${profile.goal}
- Secondary Goal/Timeline: ${profile.secondaryGoal || 'Not specified'}
- Fitness Level: ${profile.fitnessLevel}
- Workout preferences: ${profile.preferredWorkoutTypes?.join(', ') || 'Not specified'}
- Equipment available: ${profile.equipment?.join(', ') || 'Not specified'}
- Dietary style: ${profile.dietaryStyle || 'Balanced'}
- Food allergies: ${profile.allergies?.join(', ') || 'None'}
- Exclude/dislike: ${profile.foodsDisliked || 'None'}
- Include/like: ${profile.foodsLiked || 'None'}
- Other dietary restrictions: ${profile.dietaryRestrictions || 'None'}

${hasPhoto ? 'Please analyze the attached full-body photo of the user to confirm their skeletal structure, body composition, and exact body type category.' : 'Based on their physical metrics (height, weight, age) and goals, deduce their most likely body type.'}

Return your response ONLY as a valid JSON object matching this structure:
{
  "bodyType": "Ectomorph, Mesomorph, Endomorph, or specific combination like Ecto-Mesomorph",
  "explanation": "A detailed explanation of their body type, skeletal build, metabolic tendencies, and how it aligns with their stated goals.",
  "eat": ["Food 1", "Food 2", "Food 3", "Food 4", "Food 5"],
  "avoid": ["Food 1", "Food 2", "Food 3", "Food 4", "Food 5"],
  "macros": {
    "protein": 30,
    "carbs": 40,
    "fat": 30
  },
  "workoutStyle": "The ideal training style, intensity, and frequency for this body type (e.g., heavy resistance training with minimal cardio, high volume hypertrophy, etc.)",
  "timeline": "A realistic, science-backed timeline showing expected progress increments (e.g., 2-4kg weight loss in month 1, muscle definitions in weeks 6-8, etc.) to achieve their goal of: ${profile.goal}"
}

Ensure the protein, carbs, and fat values in "macros" sum up to exactly 100. Provide no pre-amble or post-amble. Return ONLY the JSON object.
`;
}

export function parseAnalysisResponse(responseText) {
  const cleanJson = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
  const result = JSON.parse(cleanJson);

  const sum = (result.macros?.protein || 0) + (result.macros?.carbs || 0) + (result.macros?.fat || 0);
  if (sum !== 100 && result.macros) {
    const total = sum || 1;
    result.macros.protein = Math.round((result.macros.protein / total) * 100);
    result.macros.carbs = Math.round((result.macros.carbs / total) * 100);
    result.macros.fat = 100 - result.macros.protein - result.macros.carbs;
  }
  return result;
}

/** Runs the body-analysis prompt end-to-end. */
export async function generateAnalysis(profile, callAI) {
  const responseText = await callAI(buildAnalysisPrompt(profile), profile.photoBase64 || null, 'image/jpeg');
  return parseAnalysisResponse(responseText);
}

function profileBlock(profile, analysis) {
  return `User Profile:
- Name: ${profile.name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Weight: ${profile.weight} kg
- Height: ${profile.height} cm
- Goal: ${profile.goal}
- Secondary Goal: ${profile.secondaryGoal || 'Not specified'}
- Body Type (Somatotype): ${analysis?.bodyType || 'Balanced'}
- Ideal Macro Split: Protein ${analysis?.macros?.protein || 30}% / Carbs ${analysis?.macros?.carbs || 40}% / Fat ${analysis?.macros?.fat || 30}%
- Fitness Level: ${profile.fitnessLevel}
- Workout preferences: ${profile.preferredWorkoutTypes?.join(', ') || 'Not specified'}
- Equipment: ${profile.equipment?.join(', ') || 'Not specified'}
- Injuries/Avoid: ${profile.exercisesToAvoid || 'None'}
- Training days/week: ${profile.trainingDaysPerWeek}
- Session duration: ${profile.sessionDuration} mins
- Dietary style: ${profile.dietaryStyle || 'Balanced'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}
- Dislikes: ${profile.foodsDisliked || 'None'}
- Likes: ${profile.foodsLiked || 'None'}
- Meals/day: ${profile.mealsPerDay}
- Dietary restrictions: ${profile.dietaryRestrictions || 'None'}`;
}

export function buildWorkoutPlanPrompt(profile, analysis) {
  return `
You are an elite Personal Trainer with 15 years experience. Generate a comprehensive, realistic 7-day Workout Plan.

${profileBlock(profile, analysis)}

CRITICAL WORKOUT RULES — READ CAREFULLY:
1. Every training day MUST be a FULL PT SESSION, not a summary. Minimum per training day:
   - warmupSteps: exactly 5 timed steps totalling 8-12 minutes
   - exercises: 7-9 exercises or timed circuits that fill the requested ${profile.sessionDuration} minute session
   - cooldownSteps: exactly 5 timed stretches/breathing steps totalling 5-8 minutes
2. NEVER write vague text like "5 minutes stretching", "dynamic warmup", "do cardio", "core work", "mobility", or "stretch". Name the exact movement and exact duration/reps.
3. Timed examples: "Bodyweight squats — 30 sec", "Dead bug — 20 sec each side", "Hip flexor stretch — 45 sec each side", "Incline treadmill walk — 5 min at RPE 4".
4. Strength examples must include sets, reps, rest, tempo, targetMuscles, notes, and progressionNote.
5. Session duration is ${profile.sessionDuration} mins — the warm-up, main session, finisher, and cool-down must plausibly fill that time.
6. Exercise selection must match the equipment available: ${profile.equipment?.join(', ') || 'bodyweight only'}.
7. Progressive overload note must be SPECIFIC per exercise — what exact weight/rep/time/rest change happens next week.

Return ONLY a valid JSON object with this exact structure:
{
  "workoutPlan": {
    "focus": "Overall weekly training split description",
    "days": [
      {
        "dayNumber": 1,
        "dayName": "Monday - Push (Chest/Shoulders/Triceps)",
        "focus": "Chest, anterior deltoid, triceps — hypertrophy focus",
        "isRestDay": false,
        "warmup": "Short summary of the warm-up",
        "warmupSteps": [
          { "name": "Incline treadmill walk", "duration": "5 min", "notes": "RPE 4, nasal breathing, gradually raise body temperature" },
          { "name": "Band pull-aparts", "duration": "45 sec", "reps": "15-20 reps", "notes": "Squeeze shoulder blades together" },
          { "name": "Scapular push-ups", "duration": "45 sec", "reps": "10-12 reps", "notes": "Keep elbows locked, move only shoulder blades" },
          { "name": "Push-up to downward dog", "duration": "60 sec", "reps": "6-8 reps", "notes": "Open chest and shoulders" },
          { "name": "Light dumbbell press warm-up set", "duration": "2 min", "reps": "2 sets x 10 reps", "notes": "Use very light load before work sets" }
        ],
        "cooldown": "Short summary of the cool-down",
        "cooldownSteps": [
          { "name": "Doorframe chest stretch", "duration": "45 sec each side", "notes": "Elbow at shoulder height, breathe slowly" },
          { "name": "Cross-body shoulder stretch", "duration": "30 sec each side", "notes": "Keep shoulder down away from ear" },
          { "name": "Overhead triceps stretch", "duration": "30 sec each side", "notes": "Do not arch lower back" },
          { "name": "Child's pose with side reach", "duration": "45 sec each side", "notes": "Reach hands to each corner" },
          { "name": "Box breathing", "duration": "90 sec", "notes": "4 sec inhale, 4 hold, 4 exhale, 4 hold" }
        ],
        "progressiveOverload": "Week 1 baseline. Next week: add 2.5kg to compound lifts if all reps completed with good form.",
        "exercises": [
          {
            "name": "Barbell Bench Press",
            "sets": "4",
            "reps": "8-10",
            "rest": "90s",
            "tempo": "3 sec lower, 1 sec pause, drive up",
            "targetMuscles": "Chest, anterior delts, triceps",
            "notes": "Retract scapula into bench. Lower bar to mid-chest with 3s eccentric. Drive through heels. Exhale on press.",
            "progressionNote": "Week 1: 60% 1RM. Week 2: +2.5kg if form is solid. Week 3: +2.5kg or increase to 4x10."
          },
          {
            "name": "Incline Dumbbell Press",
            "sets": "3",
            "reps": "10-12",
            "rest": "75s",
            "tempo": "2 sec lower, controlled press",
            "targetMuscles": "Upper chest, shoulders",
            "notes": "Bench at 30 degrees. Keep wrists stacked over elbows.",
            "progressionNote": "Add 1-2 reps per set before increasing dumbbells by 2kg."
          }
        ]
      }
    ]
  }
}

Rules:
- workoutPlan.days: provide exactly 7 days. Mark rest days with isRestDay: true and empty exercises array.
- Training days = ${profile.trainingDaysPerWeek}. Remaining days = rest.
- Each training day MUST have a MINIMUM of 7 exercises — 8-9 is ideal. NEVER generate a session with fewer than 7 exercises.
- warmupSteps must contain exactly 5 named timed movements. cooldownSteps must contain exactly 5 named timed stretches/breathing drills.
- Each exercise MUST be a single named movement with its own sets, reps, rest, tempo, targetMuscles, notes, and progressionNote. NEVER group exercises into circuits or supersets — list every exercise individually.
- exercises.notes: write like a qualified PT coaching cue — form, tempo, breathing.
- exercises.progressionNote: specific week-by-week overload strategy for this exercise.
- Return ONLY the JSON. No preamble, no markdown.
`;
}

export function buildNutritionPlanPrompt(profile, analysis) {
  return `
You are an elite Sports Dietitian with 15 years experience. Generate a comprehensive, realistic 7-day Nutrition Plan.

${profileBlock(profile, analysis)}

CRITICAL MEAL PLAN RULES — READ CAREFULLY:
1. Every meal must include name, time, calories, macros, ingredients with grams/ml, and prep instructions.
2. BREAKFAST must be a real breakfast food. Examples: porridge/oats, eggs on toast, yogurt with fruit and granola, smoothie with protein, scrambled eggs, avocado toast, overnight oats, pancakes, cereal with milk. NEVER serve chicken, rice, or dinner food at breakfast.
3. LUNCH should be a proper midday meal: sandwiches, wraps, salads, soups, pasta, jacket potato, stir fry, sushi bowls.
4. DINNER should be a proper evening meal: grilled fish/chicken/meat with vegetables and a carb source, pasta dishes, curry with rice, stir fry, burgers, steak, salmon.
5. SNACKS should be realistic: protein bar, fruit, Greek yogurt, nuts, rice cakes with peanut butter, cottage cheese, protein shake.
6. VARIETY is essential — do NOT repeat the same meal more than twice across the 7 days. Each day should feel different and enjoyable.
7. Make meals CULTURALLY APPROPRIATE and APPEALING — these are meals real people in the UK would actually enjoy eating.
8. Calorie targets must be REALISTIC for the user's goal and body weight. Do not under-eat — a ${profile.weight}kg person needs substantial calories.

Return ONLY a valid JSON object with this exact structure:
{
  "nutritionPlan": {
    "focus": "Overall dietary strategy description",
    "dailyTargetCalories": 2200,
    "dailyMacros": { "protein": 165, "carbs": 220, "fat": 73 },
    "generalAdvice": "Hydration, timing, and supplement tips tailored to body type."
  },
  "weeklyMealPlan": [
    {
      "dayName": "Monday",
      "dayNumber": 1,
      "meals": [
        {
          "name": "Meal 1: Breakfast",
          "time": "7:30 AM",
          "calories": 550,
          "macros": { "protein": 40, "carbs": 60, "fat": 15 },
          "ingredients": ["80g rolled oats", "250ml semi-skimmed milk", "1 medium banana", "30g whey protein powder", "15g honey"],
          "prep": "Cook oats with milk for 3-4 minutes, stir in whey after cooking, top with sliced banana and honey.",
          "whyThisMeal": "High-carbohydrate breakfast to fuel training and high protein to support recovery."
        }
      ]
    }
  ]
}

Rules:
- weeklyMealPlan: provide exactly 7 days, each with ${profile.mealsPerDay} meals (breakfast, ${Number(profile.mealsPerDay) >= 4 ? 'morning snack, ' : ''}lunch, ${Number(profile.mealsPerDay) >= 5 ? 'afternoon snack, ' : ''}dinner${Number(profile.mealsPerDay) >= 3 ? ', snack' : ''}).
- Include ingredient gram weights in every ingredient string (e.g. "150g salmon fillet").
- Every meal needs prep and whyThisMeal fields.
- BREAKFAST MUST contain breakfast foods — oats, eggs, yogurt, toast, fruit, smoothies. NEVER chicken or rice at breakfast.
- Vary meals across the week — no two identical breakfasts, lunches, or dinners.
- No allergens from: ${profile.allergies?.join(', ') || 'none'}. No dislikes: ${profile.foodsDisliked || 'none'}.
- Liked foods to include where possible: ${profile.foodsLiked || 'none'}.
- Return ONLY the JSON. No preamble, no markdown.
`;
}

/** Runs workout-plan generation, including quality-repair, end-to-end. Returns { workoutPlan }. */
export async function generateWorkoutPlan(profile, analysis, callAI) {
  const responseText = await callAI(buildWorkoutPlanPrompt(profile, analysis));
  let plan = parseAIJson(responseText);

  const qualityIssues = findPlanQualityIssues(plan);
  if (qualityIssues.length > 0) {
    plan = await repairThinPlan(plan, qualityIssues, callAI);
  }
  return { workoutPlan: plan.workoutPlan };
}

/** Runs nutrition-plan generation, including quality-repair, end-to-end. Returns { nutritionPlan, weeklyMealPlan }. */
export async function generateNutritionPlan(profile, analysis, callAI) {
  const responseText = await callAI(buildNutritionPlanPrompt(profile, analysis));
  let plan = parseAIJson(responseText);

  const qualityIssues = findPlanQualityIssues(plan);
  if (qualityIssues.length > 0) {
    plan = await repairThinPlan(plan, qualityIssues, callAI);
  }
  return { nutritionPlan: plan.nutritionPlan, weeklyMealPlan: plan.weeklyMealPlan };
}

/** Runs both workout and nutrition generation in parallel and merges the result. */
export async function generateFullPlan(profile, analysis, callAI) {
  const [workout, nutrition] = await Promise.all([
    generateWorkoutPlan(profile, analysis, callAI),
    generateNutritionPlan(profile, analysis, callAI),
  ]);
  return { ...workout, ...nutrition };
}

export function buildCheckInAdjustmentPrompt({ profile, analysis, currentPlan, checkInData, previousWeight }) {
  return `
You are an expert personal trainer. The user is doing their weekly check-in. Compare their progress, feedback, and current plan, and generate adjustments for the upcoming week.

User Profile:
- Name: ${profile.name}
- Somatotype: ${analysis?.bodyType || 'Balanced'}
- Goal: ${profile.goal}

Current Plan (Week ${currentPlan?.weekNumber || 1}):
- Workout split focus: ${currentPlan?.workoutPlan?.focus || 'Not specified'}
- Calories target: ${currentPlan?.nutritionPlan?.dailyTargetCalories || 'Not specified'}

User Weekly Check-in Stats:
- Current Weight: ${checkInData.weight} kg (Original Weight: ${profile.weight} kg, Last Check-in Weight: ${previousWeight || profile.weight} kg)
- Energy Level (1-10): ${checkInData.energy}
- Mood/Motivation (1-10): ${checkInData.mood}
- Workout Adherence: ${checkInData.adherenceWorkout} (Stuck to it)
- Nutrition Adherence: ${checkInData.adherenceNutrition} (Stuck to it)
- What went well: "${checkInData.notesWell || 'None'}"
- What was challenging: "${checkInData.notesChallenging || 'None'}"

Analyze this check-in. If adherence is low or they face challenges, modify the workout or nutrition to help them stay consistent. If energy is low, maybe lower volume or add rest. If they're crushing it, slightly increase intensity or adjust macro proportions towards their goal.

Return a compact JSON patch, not the full plan. Do NOT resend the whole existing plan.
Return your response ONLY as a valid JSON object matching this structure:
{
  "motivationalMessage": "A warm, personal message addressed directly to ${profile?.name || 'the client'} — you MUST use that exact name, never substitute another. Tone must match their week: if mood or adherence is low (≤5), be genuinely encouraging — tell them you believe in them, that one tough week doesn't define them, and to take it one step at a time. If they are doing well (mood and adherence ≥8), celebrate them — tell them they're smashing it and to keep up the hard work. If they are in the middle, acknowledge their effort with a motivating push to go the extra mile. Keep it 2-3 sentences, warm and human.",
  "adjustments": "A bulleted summary (coaching report) of exactly what you adjusted for the new week (e.g., increased cardio by 10m, reduced carbs by 20g due to low activity).",
  "workoutFocus": "Updated weekly training focus, or null if unchanged",
  "workoutDayAdjustments": [
    {
      "dayNumber": 1,
      "dayName": "Monday - Day Name",
      "focus": "Updated day focus, or null if unchanged",
      "warmup": "Short warm-up summary, or null",
      "warmupSteps": [{ "name": "Exact warm-up movement", "duration": "45 sec", "reps": "10-12 reps", "notes": "Safe performance cue." }],
      "cooldown": "Short cool-down summary, or null",
      "cooldownSteps": [{ "name": "Exact stretch", "duration": "45 sec each side", "notes": "Safe performance cue." }],
      "progressiveOverload": "Updated progression for this day, or null",
      "exerciseAdjustments": [
        { "sets": "4", "reps": "10-12", "rest": "75s", "tempo": "3 sec lower", "notes": "Full safe-performance cue.", "progressionNote": "Specific change next week." }
      ]
    }
  ],
  "nutritionAdjustments": {
    "focus": "Updated nutrition focus, or null",
    "dailyTargetCalories": 2200,
    "dailyMacros": { "protein": 165, "carbs": 220, "fat": 73 },
    "generalAdvice": "Updated advice, or null"
  },
  "mealAdjustments": []
}

Rules:
- Return only changed fields and compact arrays. Do not include unchanged meals unless necessary.
- workoutDayAdjustments can be empty if workouts do not need changing.
- If you adjust a day, include exactly 5 warmupSteps and exactly 5 cooldownSteps for that day.
- Never write vague text like "5 minutes stretching", "dynamic warmup", "mobility", "core work", or "do cardio". Name exact movements and exact durations/reps.
- All exercises, stretches, warm-ups, machines, and running/cardio must include full safe-performance explanations.
- If running is prescribed, include RPE or pace guidance, posture, foot strike/cadence cue, breathing, incline/speed, and when to slow down.
- Keep client allergies, dislikes, injuries, equipment, and goal restrictions.
- Provide no pre-amble or post-amble. Return ONLY the JSON object.
`;
}

export function buildCompleteCheckInPlanPrompt({ profile, checkInData, adjustments }) {
  return `
You are an elite Personal Trainer and Sports Dietitian. Generate a COMPLETE replacement 7-day plan after this weekly check-in.

User:
- Name: ${profile.name}
- Goal: ${profile.goal}
- Fitness level: ${profile.fitnessLevel}
- Equipment: ${profile.equipment?.join(', ') || 'Not specified'}
- Injuries/exercises to avoid: ${profile.exercisesToAvoid || 'None'}
- Dietary style: ${profile.dietaryStyle || 'Balanced'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}
- Dislikes: ${profile.foodsDisliked || 'None'}
- Meals per day: ${profile.mealsPerDay || 3}
- Training days/week: ${profile.trainingDaysPerWeek || 4}
- Session duration: ${profile.sessionDuration || 45} mins

Check-in:
- Current weight: ${checkInData.weight} kg
- Energy: ${checkInData.energy}/10
- Mood: ${checkInData.mood}/10
- Workout adherence: ${checkInData.adherenceWorkout}
- Nutrition adherence: ${checkInData.adherenceNutrition}
- What went well: ${checkInData.notesWell || 'None'}
- Challenges: ${checkInData.notesChallenging || 'None'}
- Adjustment summary to honour: ${adjustments || 'Adjust sensibly based on the check-in.'}

Return ONLY a valid JSON object with this exact structure:
{
  "workoutPlan": {
    "focus": "Specific weekly training focus",
    "days": [
      {
        "dayNumber": 1,
        "dayName": "Monday - Full Body Strength",
        "focus": "Specific muscles and intent",
        "isRestDay": false,
        "warmup": "Short summary",
        "warmupSteps": [
          { "name": "Exact movement", "duration": "45 sec", "reps": "10 reps", "notes": "Safe setup, posture, breathing, and mistakes to avoid." }
        ],
        "cooldown": "Short summary",
        "cooldownSteps": [
          { "name": "Exact stretch", "duration": "45 sec each side", "notes": "How to perform safely and where to feel it." }
        ],
        "progressiveOverload": "Specific progression for this day",
        "exercises": [
          {
            "name": "Exercise name",
            "sets": "3",
            "reps": "10-12",
            "rest": "60-90s",
            "tempo": "3 sec lower, 1 sec pause, controlled lift",
            "targetMuscles": "Main muscles",
            "notes": "Full safety explanation including setup, body position, breathing, range of motion, common mistakes, and when to stop.",
            "progressionNote": "Specific next-week progression."
          }
        ]
      }
    ]
  },
  "nutritionPlan": {
    "focus": "Specific nutrition strategy",
    "dailyTargetCalories": 2200,
    "dailyMacros": { "protein": 165, "carbs": 220, "fat": 73 },
    "generalAdvice": "Detailed practical guidance"
  },
  "weeklyMealPlan": [
    {
      "dayName": "Monday",
      "dayNumber": 1,
      "meals": [
        {
          "name": "Meal 1: Breakfast",
          "time": "7:30 AM",
          "calories": 500,
          "macros": { "protein": 40, "carbs": 50, "fat": 15 },
          "ingredients": ["80g oats", "250ml milk", "30g whey protein"],
          "prep": "Exact prep method.",
          "whyThisMeal": "Why this supports the goal."
        }
      ]
    }
  ]
}

Rules:
- workoutPlan.days must contain exactly 7 days.
- Non-rest days must match the requested training days/week and each have at least 7 exercises.
- Each non-rest day must have exactly 5 warmupSteps and exactly 5 cooldownSteps.
- weeklyMealPlan must contain exactly 7 days.
- Each day must have ${profile.mealsPerDay || 3} meals.
- Every meal must have weighed ingredients, prep, and whyThisMeal.
- No vague exercise or stretch instructions.
- Return JSON only.
`;
}

/** Applies a compact check-in adjustment patch onto an existing plan. */
export function applyCheckInPatch(plan, patch) {
  const nextPlan = {
    ...plan,
    workoutPlan: {
      ...(plan?.workoutPlan || {}),
      focus: patch?.workoutFocus || plan?.workoutPlan?.focus,
      days: (plan?.workoutPlan?.days || []).map((day) => {
        const dayPatch = (patch?.workoutDayAdjustments || []).find((item) => item.dayNumber === day.dayNumber || item.dayName === day.dayName);
        if (!dayPatch || day.isRestDay) return day;

        return {
          ...day,
          focus: dayPatch.focus || day.focus,
          progressiveOverload: dayPatch.progressiveOverload || day.progressiveOverload,
          warmup: dayPatch.warmup || day.warmup,
          warmupSteps: dayPatch.warmupSteps || day.warmupSteps,
          cooldown: dayPatch.cooldown || day.cooldown,
          cooldownSteps: dayPatch.cooldownSteps || day.cooldownSteps,
          exercises: (day.exercises || []).map((exercise, index) => ({
            ...exercise,
            ...(dayPatch.exerciseAdjustments?.[index] || {}),
          })),
        };
      }),
    },
    nutritionPlan: {
      ...(plan?.nutritionPlan || {}),
      ...(patch?.nutritionAdjustments || {}),
    },
    weeklyMealPlan: plan?.weeklyMealPlan || [],
  };

  if (patch?.mealAdjustments?.length) {
    nextPlan.weeklyMealPlan = nextPlan.weeklyMealPlan.map((day) => {
      const dayPatch = patch.mealAdjustments.find((item) => item.dayNumber === day.dayNumber || item.dayName === day.dayName);
      if (!dayPatch) return day;
      return {
        ...day,
        meals: (day.meals || []).map((meal, index) => ({
          ...meal,
          ...(dayPatch.meals?.[index] || {}),
        })),
      };
    });
  }

  return nextPlan;
}

export function planHasRenderableContent(plan) {
  const hasTrainingDays = (plan?.workoutPlan?.days || []).some((day) => !day.isRestDay && (day.exercises || []).length > 0);
  const hasMealDays = (plan?.weeklyMealPlan || []).some((day) => (day.meals || []).length > 0);
  return hasTrainingDays && hasMealDays;
}

/**
 * Runs the full check-in adjustment pipeline end-to-end: prompts for a patch,
 * applies it (or generates a complete replacement plan if the current plan
 * isn't renderable), and returns the resulting plan.
 */
export async function generateCheckInAdjustment({ profile, analysis, currentPlan, checkInData, previousWeight, callAI }) {
  const responseText = await callAI(
    buildCheckInAdjustmentPrompt({ profile, analysis, currentPlan, checkInData, previousWeight }),
    checkInData.photoBase64 || null,
    'image/jpeg'
  );

  let result;
  try {
    result = parseAIJson(responseText);
  } catch {
    result = { motivationalMessage: '', adjustments: '', workoutDayAdjustments: [], mealAdjustments: [] };
  }

  let updatedPlan = currentPlan;
  if (result.updatedPlan) {
    updatedPlan = result.updatedPlan;
  } else if (planHasRenderableContent(currentPlan)) {
    updatedPlan = applyCheckInPatch(currentPlan, result);
  } else {
    try {
      const fullResponse = await callAI(
        buildCompleteCheckInPlanPrompt({ profile, checkInData, adjustments: result.adjustments }),
        checkInData.photoBase64 || null,
        'image/jpeg'
      );
      updatedPlan = parseAIJson(fullResponse);
    } catch {
      updatedPlan = currentPlan;
    }
  }

  return { result, updatedPlan };
}
