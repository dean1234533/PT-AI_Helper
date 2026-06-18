import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Dumbbell,
  Apple,
  CheckSquare,
  User,
  Activity,
  Zap,
  ChevronRight,
  Sparkles,
  Award,
  Calendar,
  Weight,
  Cpu,
  Loader2,
  Radio
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { usePlans } from '../hooks/usePlans';
import { useCheckIns } from '../hooks/useCheckIns';
import { useGemini } from '../contexts/GeminiContext';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { currentPlan, analysis } = usePlans();
  const { checkIns, latestCheckIn } = useCheckIns();
  const { callAI } = useGemini();
  const navigate = useNavigate();

  const [testingAI, setTestingAI] = useState(false);
  const [planDayIndex, setPlanDayIndex] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const handleTestAI = async () => {
    setTestingAI(true);
    try {
      const reply = await callAI("Reply with exactly: \"DB's AI is online and ready.\"");
      toast.success(`✅ ${reply.trim()}`);
    } catch (err) {
      toast.error(`AI test failed: ${err.message}`);
    } finally {
      setTestingAI(false);
    }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Determine current day of the week to show today's workout/meals
  const todayIndex = useMemo(() => {
    const day = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
    // Map 0 -> 6 (Sunday), 1 -> 0 (Monday), 2 -> 1 (Tuesday), etc.
    return day === 0 ? 6 : day - 1;
  }, []);

  const progressSummary = useMemo(() => {
    if (!profile.weight) return { change: 0, text: 'No starting weight' };
    const currentWeight = latestCheckIn ? latestCheckIn.weight : profile.weight;
    const diff = currentWeight - profile.weight;
    
    if (diff === 0) return { change: 0, text: 'Stable' };
    const formatted = diff > 0 ? `+${diff.toFixed(1)} kg` : `${diff.toFixed(1)} kg`;
    
    // Check if goal is fat loss or muscle gain to evaluate progress
    const isLossGoal = profile.goal?.toLowerCase().includes('lose') || profile.goal?.toLowerCase().includes('fat');
    const isGoodProgress = (isLossGoal && diff < 0) || (!isLossGoal && diff > 0);

    return {
      change: diff,
      formatted,
      isGoodProgress,
      text: `${formatted} since starting`,
    };
  }, [profile, latestCheckIn]);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-950 text-white pb-20 relative overflow-hidden">
      <SEO title="Dashboard" noIndex />
        {/* Decorative glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 pt-10 space-y-8">
          {/* Header Greeting */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {greeting}, {profile.name || user?.displayName?.split(' ')[0] || 'Athlete'}
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                Welcome back to your personalized coaching studio. Here's your focus today.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-2xl backdrop-blur-md">
              <Award className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bio Somatotype</p>
                <p className="text-xs font-bold text-slate-200 capitalize">{analysis?.bodyType || 'Analyzing...'}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Weight Stat */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Current Weight</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1">
                  {latestCheckIn ? latestCheckIn.weight : profile.weight || '--'} <span className="text-xs font-normal text-slate-400">kg</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{progressSummary.text}</p>
              </div>
              <div className="p-3 bg-brand-600/10 border border-brand-500/20 text-brand-400 rounded-xl">
                <Weight className="w-5 h-5" />
              </div>
            </div>

            {/* Streak / Frequency Stat */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Weekly Target</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1">
                  {profile.trainingDaysPerWeek || '4'} <span className="text-xs font-normal text-slate-400">Days/Wk</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{profile.sessionDuration || '60'} mins / session</p>
              </div>
              <div className="p-3 bg-accent-500/10 border border-accent-500/20 text-accent-500 rounded-xl">
                <Dumbbell className="w-5 h-5" />
              </div>
            </div>

            {/* Check-ins Stat */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Check-ins Logged</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1">
                  {checkIns.length} <span className="text-xs font-normal text-slate-400">weeks</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  {latestCheckIn ? `Last: ${new Date(latestCheckIn.date).toLocaleDateString()}` : 'No logs yet'}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>

            {/* Caloric Intake Target */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Daily Calories</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1">
                  {currentPlan?.nutritionPlan?.dailyTargetCalories || '2000'} <span className="text-xs font-normal text-slate-400">kcal</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  P:{currentPlan?.nutritionPlan?.dailyMacros?.protein || '--'}g · C:{currentPlan?.nutritionPlan?.dailyMacros?.carbs || '--'}g · F:{currentPlan?.nutritionPlan?.dailyMacros?.fat || '--'}g
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                <Apple className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 7-Day Plan Viewer */}
          {(() => {
            const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const selectedWorkout = currentPlan?.workoutPlan?.days?.[planDayIndex];
            const selectedMeals = currentPlan?.weeklyMealPlan?.[planDayIndex]?.meals || [];

            return (
              <div className="space-y-4">
                {/* Day selector */}
                {currentPlan && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => setPlanDayIndex(i)}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          planDayIndex === i
                            ? 'bg-brand-600 text-white shadow-lg'
                            : i === todayIndex
                            ? 'bg-slate-800 border border-brand-500/40 text-brand-300'
                            : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        {label}
                        {i === todayIndex && <span className="ml-1 text-[8px] opacity-70">today</span>}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Workout Column */}
                  <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md">
                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-3 mb-4">
                      <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-400" />
                        {planDayIndex === todayIndex ? "Today's Routine" : `${DAY_LABELS[planDayIndex]} Routine`}
                      </h3>
                      {selectedWorkout?.isRestDay && (
                        <span className="px-2 py-0.5 bg-emerald-600/15 border border-emerald-500/25 rounded-md text-[9px] font-black text-emerald-400 uppercase tracking-wider">Rest</span>
                      )}
                    </div>

                    {!currentPlan ? (
                      <div className="py-8 text-center">
                        <p className="text-xs text-slate-500">No active workout plans found.</p>
                        <button onClick={() => navigate('/plan')} className="mt-3 text-xs bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-4 rounded-xl transition-all">
                          Generate Your Plan
                        </button>
                      </div>
                    ) : selectedWorkout?.isRestDay ? (
                      <div className="space-y-3 py-2">
                        <h4 className="font-bold text-slate-200 text-sm">Active Recovery & Relaxation</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Your somatotype requires structured recovery to reset muscles and manage hormonal profiles. Take today to rest, perform stretching, hydrate, and nourish your body.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-slate-200 text-sm">{selectedWorkout?.dayName}</h4>
                            <p className="text-[10px] text-slate-500 font-medium">{selectedWorkout?.focus}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">{selectedWorkout?.exercises?.length || 0} Exercises</span>
                        </div>

                        {selectedWorkout?.warmup && (
                          <div className="bg-brand-950/30 border border-brand-900/40 rounded-xl px-3 py-2">
                            <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-1">Warm-up</p>
                            <p className="text-xs text-slate-400">{selectedWorkout.warmup}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          {(selectedWorkout?.exercises || []).map((ex, idx) => (
                            <div key={idx} className="bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-semibold text-slate-200 text-xs">{ex.name}</span>
                                <span className="text-[10px] text-brand-400 font-bold shrink-0">{ex.sets} × {ex.reps}</span>
                              </div>
                              {(ex.rest || ex.tempo) && (
                                <p className="text-[10px] text-slate-500 mt-1">
                                  {ex.rest && `Rest: ${ex.rest}`}{ex.rest && ex.tempo && ' · '}{ex.tempo && `Tempo: ${ex.tempo}`}
                                </p>
                              )}
                              {ex.notes && <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{ex.notes}</p>}
                            </div>
                          ))}
                        </div>

                        {selectedWorkout?.cooldown && (
                          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl px-3 py-2">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Cool-down</p>
                            <p className="text-xs text-slate-400">{selectedWorkout.cooldown}</p>
                          </div>
                        )}

                        {selectedWorkout?.progressiveOverload && (
                          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl px-3 py-2">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Progressive Overload</p>
                            <p className="text-xs text-slate-400">{selectedWorkout.progressiveOverload}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {currentPlan && (
                      <button onClick={() => navigate('/plan')} className="mt-5 w-full flex items-center justify-center gap-1 py-3 border border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-950/60 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                        View Full Plan & Swap Meals <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Meals Column */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md">
                    <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider border-b border-slate-800/60 pb-3 mb-4 flex items-center gap-2">
                      <Apple className="w-4 h-4 text-emerald-400" />
                      {planDayIndex === todayIndex ? "Today's Nutrition" : `${DAY_LABELS[planDayIndex]} Nutrition`}
                    </h3>

                    {!currentPlan ? (
                      <p className="text-xs text-slate-500 text-center py-8">Generate a plan to view meals.</p>
                    ) : selectedMeals.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">No meals for this day.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedMeals.map((meal, idx) => {
                          const cal  = meal.usdaCalories ?? meal.calories;
                          const prot = meal.usdaProtein  ?? meal.macros?.protein;
                          const carb = meal.usdaCarbs    ?? meal.macros?.carbs;
                          const fat  = meal.usdaFat      ?? meal.macros?.fat;
                          return (
                            <div key={idx} className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 space-y-1.5">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-slate-200 text-xs leading-tight">{meal.name}</h4>
                                <span className="text-[10px] text-emerald-400 font-bold shrink-0">{cal ?? '—'} kcal</span>
                              </div>
                              <div className="flex gap-2 text-[10px] text-slate-500">
                                <span>P <span className="text-slate-300">{prot ?? '—'}g</span></span>
                                <span>C <span className="text-slate-300">{carb ?? '—'}g</span></span>
                                <span>F <span className="text-slate-300">{fat ?? '—'}g</span></span>
                              </div>
                              {(() => {
                                const ings = (meal.enrichedIngredients?.length ? meal.enrichedIngredients : meal.ingredients) || [];
                                const labels = ings.map(i => typeof i === 'string' ? i : (i.ingredient || i.name || i.item || i.food || i.description || '')).filter(Boolean);
                                return labels.length > 0 ? (
                                  <p className="text-[10px] text-slate-500 leading-relaxed">
                                    {labels.join(' · ')}
                                  </p>
                                ) : null;
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {currentPlan && (
                      <button onClick={() => navigate('/plan')} className="mt-5 w-full flex items-center justify-center gap-1 py-3 border border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-950/60 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                        Full Meal Details <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Actions Grid */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-300 text-xs uppercase tracking-widest">Coaching Shortcuts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/plan')}
                className="bg-slate-900/30 border border-slate-850 hover:border-slate-700 p-5 rounded-2xl flex items-center gap-4 text-left transition-all hover:scale-[1.01]"
              >
                <div className="p-3 bg-brand-600/10 text-brand-400 rounded-xl">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Workout Routines</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Explore 7-day sets, reps & splits.</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/checkin')}
                className="bg-slate-900/30 border border-slate-850 hover:border-slate-700 p-5 rounded-2xl flex items-center gap-4 text-left transition-all hover:scale-[1.01]"
              >
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Log Check-in</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Adjust plan for the upcoming week.</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/analysis')}
                className="bg-slate-900/30 border border-slate-850 hover:border-slate-700 p-5 rounded-2xl flex items-center gap-4 text-left transition-all hover:scale-[1.01]"
              >
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Bio Analysis</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Somatotype blueprint & macros.</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/profile')}
                className="bg-slate-900/30 border border-slate-850 hover:border-slate-700 p-5 rounded-2xl flex items-center gap-4 text-left transition-all hover:scale-[1.01]"
              >
                <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Update Profile</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Modify goals, diet & restrictions.</p>
                </div>
              </button>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4.5 h-4.5 text-brand-400" />
                  AI Engine (Admin)
                </h3>
                <button
                  onClick={handleTestAI}
                  disabled={testingAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {testingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                  Test AI
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Auto-rotates through all configured providers (Gemini → Groq → Cerebras → OpenRouter → Mistral) and picks the first one that works.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
