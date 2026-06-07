import { useLocalStorage } from './useLocalStorage';

export const PLANS_KEY = 'fitai_plans';
export const ANALYSIS_KEY = 'fitai_analysis';

const PLAN_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const PLAN_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function titleDay(value, fallbackIndex = 0) {
  const text = String(value || PLAN_DAY_NAMES[fallbackIndex] || 'Day').trim();
  return PLAN_DAY_NAMES.find((name) => text.toLowerCase().startsWith(name.toLowerCase())) || text;
}

function normalizeStep(step) {
  if (typeof step === 'string') return { name: step, duration: '', notes: '' };
  return {
    name: step?.name || step?.exercise || 'Movement',
    duration: step?.duration || '',
    reps: step?.reps || '',
    notes: step?.notes || '',
  };
}

function normalizeExercise(exercise) {
  return {
    name: exercise.name || exercise.exercise || 'Exercise',
    sets: String(exercise.sets ?? ''),
    reps: String(exercise.reps ?? ''),
    rest: exercise.rest || '',
    tempo: exercise.tempo || '',
    targetMuscles: exercise.targetMuscles || exercise.muscles || '',
    notes: exercise.notes || exercise.description || '',
    progressionNote: exercise.progressionNote || exercise.progression || '',
  };
}

function normalizeWorkoutDay(item, index = 0) {
  const exercises = item.exercises || item.mainWorkout || [];
  const day = titleDay(item.day || item.dayName, index);
  return {
    dayNumber: item.dayNumber || index + 1,
    dayName: item.dayName || `${day} - ${item.name || item.focus || 'Training'}`,
    focus: item.focus || item.category || item.name || '',
    isRestDay: item.isRestDay || exercises.length === 0,
    warmup: Array.isArray(item.warmup) ? 'Complete the warm-up steps below.' : (item.warmup || item.warmupSummary || ''),
    warmupSteps: (item.warmupSteps || (Array.isArray(item.warmup) ? item.warmup : [])).map(normalizeStep),
    cooldown: Array.isArray(item.cooldown) ? 'Complete the cool-down steps below.' : (item.cooldown || item.cooldownSummary || ''),
    cooldownSteps: (item.cooldownSteps || (Array.isArray(item.cooldown) ? item.cooldown : [])).map(normalizeStep),
    progressiveOverload: item.progressiveOverload || item.progressionGuide || '',
    exercises: exercises.map(normalizeExercise),
  };
}

function normalizeWorkoutPlan(workoutPlan = {}) {
  if (Array.isArray(workoutPlan.days) && workoutPlan.days.length) {
    return {
      ...workoutPlan,
      days: workoutPlan.days.map(normalizeWorkoutDay),
    };
  }

  if (!Array.isArray(workoutPlan.workouts) || !workoutPlan.workouts.length) return workoutPlan;

  const workoutByDay = new Map();
  workoutPlan.workouts.forEach((workout, index) => {
    workoutByDay.set(titleDay(workout.day, index).toLowerCase(), normalizeWorkoutDay(workout, index));
  });

  return {
    ...workoutPlan,
    days: PLAN_DAY_NAMES.map((day, index) => {
      const workout = workoutByDay.get(day.toLowerCase());
      if (workout) return { ...workout, dayNumber: index + 1 };
      const scheduled = workoutPlan.weeklySchedule?.[PLAN_DAYS[index]];
      return {
        dayNumber: index + 1,
        dayName: scheduled ? `${day} - ${scheduled}` : day,
        focus: scheduled || 'Rest and recovery',
        isRestDay: !scheduled,
        warmup: '',
        warmupSteps: [],
        cooldown: '',
        cooldownSteps: [],
        progressiveOverload: '',
        exercises: [],
      };
    }),
  };
}

function normalizeMeal(meal, label) {
  if (!meal) return null;
  return {
    name: meal.name || label,
    time: meal.time || '',
    calories: meal.calories,
    macros: meal.macros || {
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    },
    ingredients: meal.ingredients || [],
    prep: meal.prep || meal.description || meal.instructions || '',
    whyThisMeal: meal.whyThisMeal || '',
    ...meal,
  };
}

function normalizeWeeklyMealPlan(plan = {}) {
  if (Array.isArray(plan.weeklyMealPlan) && plan.weeklyMealPlan.length) {
    return plan.weeklyMealPlan.map((day, index) => ({
      dayName: day.dayName || PLAN_DAY_NAMES[index],
      dayNumber: day.dayNumber || index + 1,
      meals: (day.meals || []).map((meal, mealIndex) => normalizeMeal(meal, meal.name || `Meal ${mealIndex + 1}`)).filter(Boolean),
    }));
  }

  const nested = plan.nutritionPlan?.weeklyMealPlan;
  if (!nested || typeof nested !== 'object') return plan.weeklyMealPlan || [];

  return PLAN_DAYS.map((day, index) => {
    const source = nested[day] || {};
    const meals = [
      normalizeMeal(source.breakfast, 'Breakfast'),
      normalizeMeal(source.lunch, 'Lunch'),
      normalizeMeal(source.dinner, 'Dinner'),
      ...(source.snacks || []).map((snack, snackIndex) => normalizeMeal(snack, `Snack ${snackIndex + 1}`)),
    ].filter(Boolean);

    return {
      dayName: PLAN_DAY_NAMES[index],
      dayNumber: index + 1,
      meals,
    };
  });
}

function normalizeNutritionPlan(plan = {}) {
  const nutrition = plan.nutritionPlan || {};
  if (nutrition.dailyTargetCalories || nutrition.dailyMacros) return nutrition;

  return {
    ...nutrition,
    focus: nutrition.focus || nutrition.notes || nutrition.mealTiming || '',
    dailyTargetCalories: nutrition.dailyCalories,
    dailyMacros: nutrition.macros ? {
      protein: nutrition.macros.protein?.grams,
      carbs: nutrition.macros.carbs?.grams,
      fat: nutrition.macros.fats?.grams,
    } : nutrition.dailyMacros,
    generalAdvice: nutrition.generalAdvice || nutrition.notes || nutrition.mealTiming || '',
  };
}

function normalizePlan(plan) {
  if (!plan) return plan;
  return {
    ...plan,
    workoutPlan: normalizeWorkoutPlan(plan.workoutPlan || {}),
    nutritionPlan: normalizeNutritionPlan(plan),
    weeklyMealPlan: normalizeWeeklyMealPlan(plan),
  };
}

export function usePlans() {
  const [plans, setPlans] = useLocalStorage(PLANS_KEY, []);
  const [analysis, setAnalysis] = useLocalStorage(ANALYSIS_KEY, null);
  const normalizedPlans = plans.map(normalizePlan);

  const savePlan = (planData) => {
    const newPlan = {
      id: `plan_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      weekNumber: plans.length + 1,
      ...normalizePlan(planData),
    };
    const updated = [newPlan, ...plans];
    setPlans(updated);
    return newPlan;
  };

  const saveAnalysis = (analysisData) => {
    const updated = {
      ...analysisData,
      generatedAt: new Date().toISOString(),
    };
    setAnalysis(updated);
    return updated;
  };

  const currentPlan = normalizedPlans[0] || null;
  const clearPlans = () => { setPlans([]); setAnalysis(null); };

  return { plans: normalizedPlans, currentPlan, savePlan, analysis, saveAnalysis, clearPlans };
}
