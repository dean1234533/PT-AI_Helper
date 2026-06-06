import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { usePlans } from '../hooks/usePlans';
import { useGemini } from '../contexts/GeminiContext';
import { enrichMealPlanWithUSDA } from '../utils/usda';
import { downloadWorkoutPDF, downloadNutritionPDF } from '../utils/pdfExport';
import {
  Sparkles, Dumbbell, Apple, Download, RefreshCw, Loader2,
  Calendar, Clock, ChevronRight, TrendingUp, AlertCircle,
  Shuffle, ChevronDown, ChevronUp, Leaf, Flame, Zap, Beef,
  FileText, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Meal swap modal ─────────────────────────────────────────────────────────
function SwapModal({ meal, dayName, onSwap, onClose, callAI, profile, analysis }) {
  const [loading, setLoading] = useState(false);
  const [replacement, setReplacement] = useState(null);

  const fetchReplacement = async () => {
    setLoading(true);
    try {
      const prompt = `
You are a sports dietitian. Suggest a single meal replacement for "${meal.name}" that matches these macros:
- Calories: ~${meal.usdaCalories ?? meal.calories} kcal
- Protein: ~${meal.usdaProtein ?? meal.macros?.protein}g
- Carbs: ~${meal.usdaCarbs ?? meal.macros?.carbs}g
- Fat: ~${meal.usdaFat ?? meal.macros?.fat}g
- Body type: ${analysis?.bodyType || 'balanced'}
- Goal: ${profile.goal}
- Dietary restrictions: ${profile.dietaryRestrictions || 'none'}
- Allergies: ${profile.allergies?.join(', ') || 'none'}
- Dislikes: ${profile.foodsDisliked || 'none'}

Return ONLY a valid JSON object:
{
  "name": "Meal name",
  "time": "${meal.time || 'Same time'}",
  "calories": 500,
  "macros": { "protein": 40, "carbs": 55, "fat": 12 },
  "ingredients": ["150g ingredient with weight", "2 eggs"]
}`;
      const text = await callAI(prompt);
      const clean = text.replace(/```json/i, '').replace(/```/g, '').trim();
      setReplacement(JSON.parse(clean));
    } catch {
      toast.error('Could not fetch a replacement — try again');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReplacement(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-extrabold text-slate-100 text-base">Swap Meal</h3>
            <p className="text-slate-500 text-xs mt-0.5">Finding a replacement for <span className="text-violet-400">{meal.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xs border border-slate-700 rounded-lg px-2 py-1">✕ Cancel</button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-slate-400 text-xs">AI is finding a macro-matched replacement…</p>
          </div>
        ) : replacement ? (
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-100 text-sm">{replacement.name}</h4>
                <span className="text-slate-500 text-xs">{replacement.time}</span>
              </div>
              <ul className="space-y-1">
                {replacement.ingredients?.map((ing, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3 text-[10px] font-bold bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-white">{replacement.calories} kcal</span>
                <span className="text-violet-400">P: {replacement.macros?.protein}g</span>
                <span className="text-emerald-400">C: {replacement.macros?.carbs}g</span>
                <span className="text-amber-400">F: {replacement.macros?.fat}g</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchReplacement} className="flex-1 py-2.5 text-xs font-semibold border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors">
                Try Another
              </button>
              <button
                onClick={() => onSwap(replacement)}
                className="flex-1 py-2.5 text-xs font-semibold bg-gradient-to-r from-violet-600 to-emerald-600 text-white rounded-xl transition-all"
              >
                Use This Meal
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Exercise card with expand/collapse ──────────────────────────────────────
function ExerciseRow({ ex, idx }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border-b border-slate-800/40 ${idx % 2 === 0 ? '' : 'bg-slate-950/20'}`}>
      <div
        className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-900/20 transition-colors px-2 rounded-lg"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-black text-slate-600 w-5 text-center">{idx + 1}</span>
          <span className="font-semibold text-slate-200 text-sm truncate">{ex.name}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[10px] text-slate-400 hidden sm:block">{ex.sets} sets × {ex.reps} reps</span>
          <span className="text-[10px] text-slate-500 hidden sm:block">{ex.rest} rest</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="bg-slate-900 rounded-lg py-2 border border-slate-800">
              <p className="text-slate-500 uppercase tracking-wider">Sets</p>
              <p className="font-bold text-slate-200 mt-0.5">{ex.sets}</p>
            </div>
            <div className="bg-slate-900 rounded-lg py-2 border border-slate-800">
              <p className="text-slate-500 uppercase tracking-wider">Reps</p>
              <p className="font-bold text-slate-200 mt-0.5">{ex.reps}</p>
            </div>
            <div className="bg-slate-900 rounded-lg py-2 border border-slate-800">
              <p className="text-slate-500 uppercase tracking-wider">Rest</p>
              <p className="font-bold text-slate-200 mt-0.5">{ex.rest}</p>
            </div>
          </div>
          {ex.notes && (
            <div className="bg-violet-950/20 border border-violet-900/40 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">Coaching Cue</p>
              <p className="text-xs text-slate-300 leading-relaxed">{ex.notes}</p>
            </div>
          )}
          {ex.progressionNote && (
            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Progressive Overload</p>
              <p className="text-xs text-slate-300 leading-relaxed">{ex.progressionNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Meal card ───────────────────────────────────────────────────────────────
function MealCard({ meal, onSwap }) {
  const [showIngredients, setShowIngredients] = useState(false);
  const cal    = meal.usdaCalories  ?? meal.calories;
  const prot   = meal.usdaProtein   ?? meal.macros?.protein;
  const carbs  = meal.usdaCarbs     ?? meal.macros?.carbs;
  const fat    = meal.usdaFat       ?? meal.macros?.fat;
  const fibre  = meal.usdaFibre;
  const isUsda = meal.dataSource === 'usda';

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 backdrop-blur-xl shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3 gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-100 text-sm truncate">{meal.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />{meal.time}
            </span>
            {isUsda && (
              <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5" />USDA verified
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onSwap(meal)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-[10px] font-semibold rounded-xl transition-all shrink-0"
        >
          <Shuffle className="w-3 h-3" />Swap
        </button>
      </div>

      {/* Macro strip */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        <div className="bg-slate-950/60 rounded-xl p-2 text-center border border-slate-850">
          <Flame className="w-3 h-3 text-orange-400 mx-auto mb-0.5" />
          <p className="text-[9px] text-slate-500 font-semibold">KCAL</p>
          <p className="text-xs font-black text-white">{cal ?? '—'}</p>
        </div>
        <div className="bg-slate-950/60 rounded-xl p-2 text-center border border-slate-850">
          <Beef className="w-3 h-3 text-violet-400 mx-auto mb-0.5" />
          <p className="text-[9px] text-slate-500 font-semibold">PROTEIN</p>
          <p className="text-xs font-black text-violet-400">{prot ?? '—'}g</p>
        </div>
        <div className="bg-slate-950/60 rounded-xl p-2 text-center border border-slate-850">
          <Zap className="w-3 h-3 text-emerald-400 mx-auto mb-0.5" />
          <p className="text-[9px] text-slate-500 font-semibold">CARBS</p>
          <p className="text-xs font-black text-emerald-400">{carbs ?? '—'}g</p>
        </div>
        <div className="bg-slate-950/60 rounded-xl p-2 text-center border border-slate-850">
          <Leaf className="w-3 h-3 text-amber-400 mx-auto mb-0.5" />
          <p className="text-[9px] text-slate-500 font-semibold">{fibre != null ? 'FIBRE' : 'FAT'}</p>
          <p className="text-xs font-black text-amber-400">{fibre != null ? `${fibre}g` : `${fat ?? '—'}g`}</p>
        </div>
      </div>

      {/* Ingredients toggle */}
      <button
        onClick={() => setShowIngredients(s => !s)}
        className="flex items-center justify-between w-full text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1"
      >
        <span>Ingredients ({(meal.enrichedIngredients || meal.ingredients || []).length} items)</span>
        {showIngredients ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showIngredients && (
        <ul className="mt-2 space-y-1.5">
          {(meal.enrichedIngredients || meal.ingredients || []).map((ing, i) => {
            const isEnriched = typeof ing === 'object';
            const label = isEnriched ? ing.ingredient : ing;
            const verified = isEnriched && ing.source === 'usda';
            return (
              <li key={i} className="text-xs text-slate-300 bg-slate-950/40 border border-slate-850 rounded-xl px-3 py-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span>{label}</span>
                    {verified && (
                      <span className="ml-2 text-[9px] text-emerald-400">
                        {ing.calories}kcal · P{ing.protein}g · C{ing.carbs}g · F{ing.fat}g{ing.fibre ? ` · Fibre${ing.fibre}g` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Fat (shown separately if fibre shown above) */}
      {fibre != null && (
        <p className="text-[9px] text-slate-600 mt-2">Fat: {fat ?? '—'}g</p>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MyPlan() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { currentPlan, savePlan, analysis } = usePlans();
  const { callAI } = useGemini();

  const [activeTab, setActiveTab] = useState('workout');
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeNutDayIdx, setActiveNutDayIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState(null);
  const [swapMeal, setSwapMeal] = useState(null); // { meal, dayIdx }

  // ── Generate full plan ──────────────────────────────────────────────────────
  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `
You are an elite Personal Trainer and Sports Dietitian. Generate a comprehensive 7-day Workout & Nutrition Plan.

User Profile:
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
- Dietary restrictions: ${profile.dietaryRestrictions || 'None'}

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
        "warmup": "5 min treadmill + dynamic chest openers + shoulder circles",
        "cooldown": "Pec stretch, doorframe chest stretch, child's pose 5 min",
        "progressiveOverload": "Week 1 baseline. Next week: add 2.5kg to compound lifts if all reps completed with good form.",
        "exercises": [
          {
            "name": "Barbell Bench Press",
            "sets": "4",
            "reps": "8-10",
            "rest": "90s",
            "notes": "Retract scapula into bench. Lower bar to mid-chest with 3s eccentric. Drive through heels. Exhale on press.",
            "progressionNote": "Week 1: 60% 1RM. Week 2: +2.5kg if form is solid. Week 3: +2.5kg or increase to 4x10."
          }
        ]
      }
    ]
  },
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
          "ingredients": ["150g rolled oats", "2 whole eggs", "30g whey protein", "200ml semi-skimmed milk", "1 medium banana"]
        }
      ]
    }
  ]
}

Rules:
- workoutPlan.days: provide exactly 7 days. Mark rest days with isRestDay: true and empty exercises array.
- Training days = ${profile.trainingDaysPerWeek}. Remaining days = rest.
- weeklyMealPlan: provide exactly 7 days, each with ${profile.mealsPerDay} meals (breakfast, ${Number(profile.mealsPerDay) >= 4 ? 'morning snack, ' : ''}lunch, ${Number(profile.mealsPerDay) >= 5 ? 'afternoon snack, ' : ''}dinner${Number(profile.mealsPerDay) >= 3 ? ', snack' : ''}).
- Include ingredient gram weights in every ingredient string (e.g. "150g chicken breast").
- exercises.notes: write like a qualified PT coaching cue — form, tempo, breathing.
- exercises.progressionNote: specific week-by-week overload strategy for this exercise.
- No allergens from: ${profile.allergies?.join(', ') || 'none'}. No dislikes: ${profile.foodsDisliked || 'none'}.
- Return ONLY the JSON. No preamble, no markdown.
`;

      const responseText = await callAI(prompt);
      const cleanJson = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
      const plan = JSON.parse(cleanJson);

      const saved = savePlan(plan);
      toast.success('Plan generated! Running USDA nutrition lookup…');

      // Enrich with USDA
      setUsdaLoading(true);
      try {
        const enriched = await enrichMealPlanWithUSDA(plan.weeklyMealPlan || []);
        savePlan({ ...plan, weeklyMealPlan: enriched });
        toast.success('Nutrition data verified with USDA FoodData Central!');
      } catch {
        toast('Plan saved — USDA lookup partially failed', { icon: '⚠️' });
      } finally {
        setUsdaLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate plan.');
    } finally {
      setLoading(false);
    }
  };

  // ── Meal swap ───────────────────────────────────────────────────────────────
  const handleSwapConfirm = async (replacement) => {
    const { dayIdx, meal } = swapMeal;
    const updatedDays = (currentPlan.weeklyMealPlan || []).map((day, dIdx) => {
      if (dIdx !== dayIdx) return day;
      return {
        ...day,
        meals: day.meals.map(m => m.name === meal.name ? { ...replacement, dataSource: 'ai-swap' } : m),
      };
    });
    savePlan({ ...currentPlan, weeklyMealPlan: updatedDays });
    setSwapMeal(null);
    toast.success('Meal swapped!');
  };

  // ── PDF export ──────────────────────────────────────────────────────────────
  const handleWorkoutPDF = () => {
    if (!currentPlan) return;
    setExporting('workout');
    try {
      downloadWorkoutPDF(currentPlan, profile);
      toast.success('Workout PDF downloaded!');
    } catch (e) {
      toast.error('PDF export failed');
    } finally {
      setExporting('');
    }
  };

  const handleNutritionPDF = () => {
    if (!currentPlan) return;
    setExporting('nutrition');
    try {
      downloadNutritionPDF(currentPlan, profile);
      toast.success('Nutrition PDF downloaded!');
    } catch (e) {
      toast.error('PDF export failed');
    } finally {
      setExporting('');
    }
  };

  useEffect(() => {
    if (!currentPlan && profile.profileComplete) generatePlan();
  }, [profile, currentPlan]);

  // ── Loading states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto" />
            <Sparkles className="w-8 h-8 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Generating Your 7-Day Plan
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              AI is calibrating workouts, progressive overload, and 7 days of personalised meals…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="p-4 bg-red-950/20 border border-red-950 rounded-2xl text-red-400">
            <h2 className="font-bold text-lg">Generation Failed</h2>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <button onClick={generatePlan} className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-2xl mx-auto transition-colors">
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <p className="text-slate-400 text-sm">Please complete your profile and body analysis first.</p>
        <button onClick={() => navigate('/setup/profile')} className="mt-4 px-4 py-2 bg-violet-600 rounded-xl text-xs font-semibold">
          Go to Profile Setup
        </button>
      </div>
    );
  }

  const { workoutPlan, nutritionPlan, weeklyMealPlan } = currentPlan;
  const todayWorkoutDay = workoutPlan?.days?.[activeDayIdx];
  const todayMealDay   = weeklyMealPlan?.[activeNutDayIdx];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 pt-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              My Fitness Plan
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Week {currentPlan.weekNumber} · Tailored to your somatotype & goals
              {usdaLoading && <span className="ml-2 text-emerald-400 animate-pulse">· Verifying nutrition with USDA…</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWorkoutPDF}
              disabled={exporting === 'workout'}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/25 rounded-xl text-xs font-semibold text-violet-400 hover:text-violet-300 transition-all disabled:opacity-50"
            >
              {exporting === 'workout' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Workout PDF
            </button>
            <button
              onClick={handleNutritionPDF}
              disabled={exporting === 'nutrition'}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-all disabled:opacity-50"
            >
              {exporting === 'nutrition' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Nutrition PDF
            </button>
            <button
              onClick={generatePlan}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex p-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl max-w-sm mb-8">
          <button
            onClick={() => setActiveTab('workout')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'workout'
                ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-4 h-4" /> Workout
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'nutrition'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple className="w-4 h-4" /> Nutrition
          </button>
        </div>

        {/* ── WORKOUT TAB ── */}
        {activeTab === 'workout' && (
          <div className="space-y-6">
            {/* Focus card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex gap-4">
              <AlertCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Weekly Training Focus</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{workoutPlan?.focus}</p>
              </div>
            </div>

            {/* Day selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {workoutPlan?.days?.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveDayIdx(idx)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    activeDayIdx === idx
                      ? day.isRestDay
                        ? 'bg-emerald-600 border-transparent text-white'
                        : 'bg-violet-600 border-transparent text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {DAYS[idx].slice(0, 3)}
                  {day.isRestDay && <span className="block text-[8px] opacity-70">Rest</span>}
                </button>
              ))}
            </div>

            {/* Active day card */}
            {todayWorkoutDay && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600/10 rounded-xl text-violet-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-100 text-base">{todayWorkoutDay.dayName}</h3>
                      <p className="text-slate-400 text-xs mt-0.5">{todayWorkoutDay.focus}</p>
                    </div>
                  </div>
                  {todayWorkoutDay.isRestDay ? (
                    <span className="self-start sm:self-center px-3 py-1 bg-emerald-600/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">Rest & Recover</span>
                  ) : (
                    <span className="self-start sm:self-center px-3 py-1 bg-violet-600/10 border border-violet-500/20 rounded-full text-violet-400 text-[10px] font-extrabold uppercase tracking-wider">Training Day</span>
                  )}
                </div>

                {todayWorkoutDay.isRestDay ? (
                  <p className="text-slate-400 text-sm leading-relaxed italic">
                    Take this day to rest. Hydrate, focus on mobility, light stretching, and active recovery. Your muscles grow during rest — honour it.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Warm / Cool */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-850 text-xs">
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Warm Up</span>
                        <p className="text-slate-300 mt-1 leading-relaxed">{todayWorkoutDay.warmup}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Cool Down</span>
                        <p className="text-slate-300 mt-1 leading-relaxed">{todayWorkoutDay.cooldown}</p>
                      </div>
                    </div>

                    {/* Progressive overload banner */}
                    {todayWorkoutDay.progressiveOverload && (
                      <div className="bg-violet-950/20 border border-violet-900/40 rounded-2xl px-5 py-3 flex items-start gap-3">
                        <TrendingUp className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Progressive Overload</p>
                          <p className="text-xs text-slate-300 leading-relaxed mt-1">{todayWorkoutDay.progressiveOverload}</p>
                        </div>
                      </div>
                    )}

                    {/* Exercises — tap to expand for coaching cues */}
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                        Tap any exercise for coaching cues & progression notes
                      </p>
                      <div className="border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/50">
                        {todayWorkoutDay.exercises?.map((ex, exIdx) => (
                          <ExerciseRow key={exIdx} ex={ex} idx={exIdx} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── NUTRITION TAB ── */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6">
            {/* Daily targets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex gap-4">
                <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Nutrition Strategy</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{nutritionPlan?.focus}</p>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col justify-center space-y-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Daily Target</span>
                  <h3 className="text-2xl font-black text-emerald-400 mt-0.5">
                    {nutritionPlan?.dailyTargetCalories} <span className="text-xs font-semibold text-slate-400">kcal</span>
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-800/60 pt-3 text-center">
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Protein</span>
                    <span className="block font-bold text-xs text-violet-400 mt-0.5">{nutritionPlan?.dailyMacros?.protein}g</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Carbs</span>
                    <span className="block font-bold text-xs text-emerald-400 mt-0.5">{nutritionPlan?.dailyMacros?.carbs}g</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Fat</span>
                    <span className="block font-bold text-xs text-amber-500 mt-0.5">{nutritionPlan?.dailyMacros?.fat}g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7-day selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(weeklyMealPlan || []).map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveNutDayIdx(idx)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    activeNutDayIdx === idx
                      ? 'bg-emerald-600 border-transparent text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {(day.dayName || DAYS[idx]).slice(0, 3)}
                </button>
              ))}
            </div>

            {/* Meals for selected day */}
            {todayMealDay ? (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  {todayMealDay.dayName} — {(todayMealDay.meals || []).length} Meals
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(todayMealDay.meals || []).map((meal, mIdx) => (
                    <MealCard
                      key={mIdx}
                      meal={meal}
                      onSwap={(m) => setSwapMeal({ meal: m, dayIdx: activeNutDayIdx })}
                    />
                  ))}
                </div>

                {/* Daily totals from USDA */}
                {(() => {
                  const usdaMeals = (todayMealDay.meals || []).filter(m => m.dataSource === 'usda');
                  if (usdaMeals.length === 0) return null;
                  const totals = usdaMeals.reduce((acc, m) => ({
                    cal:    acc.cal    + (m.usdaCalories  || 0),
                    prot:   acc.prot   + (m.usdaProtein   || 0),
                    carbs:  acc.carbs  + (m.usdaCarbs     || 0),
                    fat:    acc.fat    + (m.usdaFat       || 0),
                    fibre:  acc.fibre  + (m.usdaFibre     || 0),
                  }), { cal: 0, prot: 0, carbs: 0, fat: 0, fibre: 0 });
                  return (
                    <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" /> USDA Verified Daily Totals
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <span className="text-white font-bold">{Math.round(totals.cal)} kcal</span>
                        <span className="text-violet-400">Protein: {Math.round(totals.prot * 10) / 10}g</span>
                        <span className="text-emerald-400">Carbs: {Math.round(totals.carbs * 10) / 10}g</span>
                        <span className="text-amber-400">Fat: {Math.round(totals.fat * 10) / 10}g</span>
                        {totals.fibre > 0 && <span className="text-teal-400">Fibre: {Math.round(totals.fibre * 10) / 10}g</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-sm">
                No meal data found. <button onClick={generatePlan} className="text-violet-400 underline ml-1">Generate Plan</button>
              </div>
            )}

            {/* General advice */}
            {nutritionPlan?.generalAdvice && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-3">
                <h3 className="font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3 text-sm">
                  <TrendingUp className="w-5 h-5 text-emerald-400" /> Coaching Guidelines
                </h3>
                <p className="text-xs text-slate-350 leading-relaxed italic">{nutritionPlan.generalAdvice}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meal swap modal */}
      {swapMeal && (
        <SwapModal
          meal={swapMeal.meal}
          dayIdx={swapMeal.dayIdx}
          onSwap={handleSwapConfirm}
          onClose={() => setSwapMeal(null)}
          callAI={callAI}
          profile={profile}
          analysis={analysis}
        />
      )}
    </div>
  );
}
