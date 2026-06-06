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
  Copy,
  Link,
  Plus,
  Bot,
  Cpu,
  CheckCircle,
  Loader2,
  Radio
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { usePlans } from '../hooks/usePlans';
import { useCheckIns } from '../hooks/useCheckIns';
import { generateInviteToken } from '../utils/invite';
import { useGemini } from '../contexts/GeminiContext';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { currentPlan, analysis } = usePlans();
  const { checkIns, latestCheckIn } = useCheckIns();
  const { activeProvider, activeModel, setAdminProvider, setAdminModel, AI_PROVIDERS, callAI } = useGemini();
  const navigate = useNavigate();

  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [testingAI, setTestingAI] = useState(false);

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim();
    if (!cleanEmail) {
      toast.error('Please enter an email address');
      return;
    }
    try {
      const token = await generateInviteToken(cleanEmail);
      const base = window.location.origin;
      const link = `${base}/register?email=${encodeURIComponent(cleanEmail)}&token=${token}`;
      setGeneratedLink(link);
      toast.success('Invite link generated!');
    } catch (err) {
      toast.error('Failed to generate invite link');
    }
  };

  const handleTestAI = async () => {
    setTestingAI(true);
    try {
      const reply = await callAI('Reply with exactly: "PT AI Helper is online and ready."');
      toast.success(`✅ ${reply.trim()}`);
    } catch (err) {
      toast.error(`AI test failed: ${err.message}`);
    } finally {
      setTestingAI(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast.success('Invite link copied to clipboard!');
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

  const todayWorkout = useMemo(() => {
    if (!currentPlan?.workoutPlan?.days) return null;
    return currentPlan.workoutPlan.days[todayIndex] || currentPlan.workoutPlan.days[0];
  }, [currentPlan, todayIndex]);

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
              <div className="p-3 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-xl">
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

          {/* Today's Focus Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workout Column */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-3 mb-4">
                  <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4.5 h-4.5 text-violet-400" />
                    Today's Routine
                  </h3>
                  {todayWorkout?.isRestDay && (
                    <span className="px-2 py-0.5 bg-emerald-600/15 border border-emerald-500/25 rounded-md text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                      Rest
                    </span>
                  )}
                </div>

                {!currentPlan ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-slate-500">No active workout plans found.</p>
                    <button
                      onClick={() => navigate('/plan')}
                      className="mt-3 text-xs bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-xl transition-all"
                    >
                      Generate Your Plan
                    </button>
                  </div>
                ) : todayWorkout?.isRestDay ? (
                  <div className="space-y-3 py-2">
                    <h4 className="font-bold text-slate-200 text-sm">Active Recovery & Relaxation</h4>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Your somatotype requires structured recovery to reset muscles and manage hormonal profiles. Take today to rest, perform stretching, hydrate, and nourish your body.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-150 text-sm">{todayWorkout?.dayName}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">{todayWorkout?.focus}</p>
                      </div>
                      <span className="text-[10px] text-slate-450 font-bold">
                        {todayWorkout?.exercises?.length || 0} Exercises
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {todayWorkout?.exercises?.slice(0, 4).map((ex, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-slate-950/40 border border-slate-850 px-4 py-2.5 rounded-xl">
                          <span className="font-semibold text-slate-300">{ex.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{ex.sets} sets × {ex.reps} reps</span>
                        </div>
                      ))}
                      {todayWorkout?.exercises?.length > 4 && (
                        <p className="text-[10px] text-slate-500 text-center font-semibold pt-1">
                          + {todayWorkout.exercises.length - 4} more exercises in full plan
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {currentPlan && (
                <button
                  onClick={() => navigate('/plan')}
                  className="mt-6 w-full flex items-center justify-center gap-1 py-3 border border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-950/60 rounded-2xl text-xs font-semibold text-slate-350 hover:text-white transition-colors"
                >
                  View Full Week Schedule
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Meals Column */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider border-b border-slate-800/60 pb-3 mb-4 flex items-center gap-2">
                  <Apple className="w-4.5 h-4.5 text-emerald-400" />
                  Today's Nutritional Targets
                </h3>

                {!currentPlan ? (
                  <p className="text-xs text-slate-500 text-center py-8">Generate a plan to view meals.</p>
                ) : (
                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                    {currentPlan.nutritionPlan?.meals?.map((meal, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs bg-slate-950/40 border border-slate-850 p-3 rounded-xl gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-300 truncate text-xs">{meal.name}</h4>
                          <span className="text-[9px] text-slate-500">{meal.time}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold shrink-0">{meal.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {currentPlan && (
                <button
                  onClick={() => navigate('/plan')}
                  className="mt-6 w-full flex items-center justify-center gap-1 py-3 border border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-950/60 rounded-2xl text-xs font-semibold text-slate-350 hover:text-white transition-colors"
                >
                  Show Ingredients & Guidance
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-300 text-xs uppercase tracking-widest">Coaching Shortcuts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/plan')}
                className="bg-slate-900/30 border border-slate-850 hover:border-slate-700 p-5 rounded-2xl flex items-center gap-4 text-left transition-all hover:scale-[1.01]"
              >
                <div className="p-3 bg-violet-600/10 text-violet-400 rounded-xl">
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
            <>
              {/* ── Admin: AI Provider Switcher ── */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4.5 h-4.5 text-violet-400" />
                    AI Engine (Admin Only)
                  </h3>
                  <button
                    onClick={handleTestAI}
                    disabled={testingAI}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {testingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                    Test Active Provider
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Switch the AI engine powering your plan generation and chat. All providers use your built-in API keys — no user setup needed.
                </p>

                {/* Provider cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.values(AI_PROVIDERS).map((p) => {
                    const isActive = activeProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setAdminProvider(p.id); toast.success(`Switched to ${p.label}`); }}
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all ${
                          isActive
                            ? 'border-violet-500/60 bg-violet-600/10 shadow-lg shadow-violet-900/20'
                            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        {isActive && (
                          <CheckCircle className="absolute top-2 right-2 w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs"
                          style={{ backgroundColor: p.color + '33', border: `1px solid ${p.color}55` }}
                        >
                          <span style={{ color: p.color }}>{p.label.slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 text-xs">{p.label}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{p.badge}</p>
                          {p.supportsVision && (
                            <p className="text-[8px] text-emerald-400 mt-0.5 font-semibold">📷 Vision</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Model selector for active provider */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Bot className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-semibold text-slate-300">Active Model:</span>
                  </div>
                  <select
                    value={activeModel}
                    onChange={(e) => { setAdminModel(e.target.value); toast.success('Model updated'); }}
                    className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-violet-500 rounded-xl py-2 px-3 text-slate-200 text-xs outline-none transition-all"
                  >
                    {AI_PROVIDERS[activeProvider]?.models.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-[10px] text-slate-400 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {AI_PROVIDERS[activeProvider]?.label} active
                  </div>
                </div>

                {/* Key status strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: 'Gemini',     key: import.meta.env.VITE_GEMINI_API_KEY },
                    { label: 'Groq',       key: import.meta.env.VITE_GROQ_API_KEY },
                    { label: 'Cerebras',   key: import.meta.env.VITE_CEREBRAS_API_KEY },
                    { label: 'OpenRouter', key: import.meta.env.VITE_OPENROUTER_API_KEY },
                    { label: 'Mistral',    key: import.meta.env.VITE_MISTRAL_API_KEY },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 bg-slate-950/60 border border-slate-850 rounded-xl px-3 py-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.key ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      <span className="text-[10px] text-slate-400 font-semibold">{item.label}</span>
                      <span className={`text-[9px] ml-auto ${item.key ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.key ? '✓ Loaded' : '✗ Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Admin: Invite Link Generator ── */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-4">
                <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Link className="w-4.5 h-4.5 text-violet-400" />
                  Invite Link Generator (Admin Only)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate a secure, email-locked registration link to invite a new client. This prevents public registrations and locks the link to the client's email address.
                </p>

                <form onSubmit={handleGenerateInvite} className="flex flex-col sm:flex-row gap-3 max-w-xl">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Generate Link
                  </button>
                </form>

                {generatedLink && (
                  <div className="mt-4 bg-slate-950/60 p-4 border border-slate-850 rounded-2xl flex items-center justify-between gap-4 max-w-xl">
                    <span className="text-xxs text-violet-400 font-mono break-all select-all">
                      {generatedLink}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all shrink-0"
                      title="Copy Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
