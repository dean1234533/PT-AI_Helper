import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { usePlans } from '../hooks/usePlans';
import { useCheckIns } from '../hooks/useCheckIns';
import { useGemini } from '../contexts/GeminiContext';
import {
  ClipboardList,
  Sparkles,
  History,
  TrendingUp,
  Camera,
  Upload,
  X,
  Plus,
  ArrowRight,
  Smile,
  Zap,
  Weight,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CheckIn() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { currentPlan, savePlan, analysis } = usePlans();
  const { checkIns, saveCheckIn, latestCheckIn } = useCheckIns();
  const { callAI } = useGemini();

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState(profile.weight || '');
  const [energy, setEnergy] = useState(7);
  const [mood, setMood] = useState(7);
  const [adherenceWorkout, setAdherenceWorkout] = useState('partial'); // 'yes' | 'partial' | 'no'
  const [adherenceNutrition, setAdherenceNutrition] = useState('partial'); // 'yes' | 'partial' | 'no'
  const [notesWell, setNotesWell] = useState('');
  const [notesChallenging, setNotesChallenging] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [adjustmentSummary, setAdjustmentSummary] = useState(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image size must be less than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      setPhotoBase64(base64String);
      setImagePreview(reader.result);
      toast.success('Progress photo loaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoBase64(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!weight || weight <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    setLoading(true);
    setAdjustmentSummary(null);
    try {
      const checkInData = {
        weight: Number(weight),
        energy,
        mood,
        adherenceWorkout,
        adherenceNutrition,
        notesWell,
        notesChallenging,
        photoBase64,
      };

      const prompt = `
You are an expert personal trainer. The user is doing their weekly check-in. Compare their progress, feedback, and current plan, and generate adjustments for the upcoming week.

User Profile:
- Name: ${profile.name}
- Somatotype: ${analysis?.bodyType || 'Balanced'}
- Goal: ${profile.goal}

Current Plan (Week ${currentPlan?.weekNumber || 1}):
- Workout split focus: ${currentPlan?.workoutPlan?.focus || 'Not specified'}
- Calories target: ${currentPlan?.nutritionPlan?.dailyTargetCalories || 'Not specified'}

User Weekly Check-in Stats:
- Current Weight: ${weight} kg (Original Weight: ${profile.weight} kg, Last Check-in Weight: ${latestCheckIn?.weight || profile.weight} kg)
- Energy Level (1-10): ${energy}
- Mood/Motivation (1-10): ${mood}
- Workout Adherence: ${adherenceWorkout} (Stuck to it)
- Nutrition Adherence: ${adherenceNutrition} (Stuck to it)
- What went well: "${notesWell || 'None'}"
- What was challenging: "${notesChallenging || 'None'}"

Analyze this check-in. If adherence is low or they face challenges, modify the workout or nutrition to help them stay consistent. If energy is low, maybe lower volume or add rest. If they're crushing it, slightly increase intensity or adjust macro proportions towards their goal.

Return your response ONLY as a valid JSON object matching this structure:
{
  "adjustments": "A bulleted summary (coaching report) of exactly what you adjusted for the new week (e.g., increased cardio by 10m, reduced carbs by 20g due to low activity) and motivational feedback.",
  "updatedPlan": {
    "focus": "Focus of training for the new week.",
    "workoutPlan": {
      "focus": "Focus of the new week's training split.",
      "days": [
        {
          "dayNumber": 1,
          "dayName": "Monday - Day Name",
          "focus": "split focus",
          "isRestDay": false,
          "warmup": "warm-up routine",
          "cooldown": "cool-down routine",
          "exercises": [
            {
              "name": "Exercise Name",
              "sets": "Sets",
              "reps": "Reps",
              "rest": "Rest",
              "notes": "Coaching note"
            }
          ]
        }
      ]
    },
    "nutritionPlan": {
      "focus": "Overall nutrition focus",
      "dailyTargetCalories": 2200,
      "dailyMacros": { "protein": 165, "carbs": 220, "fat": 73 },
      "meals": [
        {
          "name": "Meal name",
          "time": "Meal time",
          "calories": 500,
          "macros": { "protein": 40, "carbs": 50, "fat": 15 },
          "ingredients": ["Ingredient 1", "Ingredient 2"]
        }
      ],
      "generalAdvice": "Coaching advice for nutrition"
    }
  }
}

Ensure the updatedPlan has the exact structure of the previous plan. Provide no pre-amble or post-amble. Return ONLY the JSON object.
`;

      const responseText = await callAI(
        prompt,
        photoBase64 || null,
        'image/jpeg'
      );
      
      const cleanJson = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      // Save checkin alongside adjustments
      saveCheckIn({
        ...checkInData,
        planAdjustments: result.adjustments,
      });

      // Save the new updated plan
      savePlan(result.updatedPlan);

      setAdjustmentSummary(result.adjustments);
      toast.success('Check-in submitted & plan updated!');
      
      // Reset form fields
      setNotesWell('');
      setNotesChallenging('');
      setPhotoBase64(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to submit check-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 pt-12">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Weekly Check-in
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Submit your metrics, compliance levels, and progress photos to fine-tune your schedules.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl max-w-xs mb-8">
          <button
            onClick={() => { setActiveTab('new'); setAdjustmentSummary(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'new'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            New Check-in
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            History ({checkIns.length})
          </button>
        </div>

        {activeTab === 'new' ? (
          <div className="space-y-8">
            {adjustmentSummary && (
              <div className="bg-emerald-950/20 border border-emerald-900/60 p-6 rounded-3xl backdrop-blur-xl shadow-xl space-y-3">
                <h3 className="font-extrabold text-emerald-400 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Plan Successfully Updated
                </h3>
                <div className="text-xs text-slate-350 leading-relaxed whitespace-pre-line">
                  {adjustmentSummary}
                </div>
                <button
                  onClick={() => navigate('/plan')}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  View Updated Plan <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl space-y-6">
              {/* Weight Slider / Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                    <Weight className="w-4 h-4 text-blue-400" /> Current Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 74.5"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3.5 px-4 text-slate-100 text-sm outline-none transition-all"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> Energy Levels (1-10)
                    </label>
                    <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={energy}
                        onChange={(e) => setEnergy(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                      />
                      <span className="font-extrabold text-sm text-slate-200 min-w-4 text-center">{energy}</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                      <Smile className="w-4 h-4 text-emerald-400" /> Mood / Motivation (1-10)
                    </label>
                    <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={mood}
                        onChange={(e) => setMood(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                      />
                      <span className="font-extrabold text-sm text-slate-200 min-w-4 text-center">{mood}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adherences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Workout Plan Adherence
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'yes', label: '100% Stuck' },
                      { key: 'partial', label: 'Partially' },
                      { key: 'no', label: 'Missed Most' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setAdherenceWorkout(item.key)}
                        className={`py-3 text-xs font-semibold rounded-2xl border transition-all ${
                          adherenceWorkout === item.key
                            ? 'bg-blue-600 border-transparent text-white'
                            : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Nutrition Plan Adherence
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'yes', label: '100% Stuck' },
                      { key: 'partial', label: 'Partially' },
                      { key: 'no', label: 'Missed Most' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setAdherenceNutrition(item.key)}
                        className={`py-3 text-xs font-semibold rounded-2xl border transition-all ${
                          adherenceNutrition === item.key
                            ? 'bg-blue-600 border-transparent text-white'
                            : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Free Text Feedbacks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    What went well this week?
                  </label>
                  <textarea
                    rows={3}
                    value={notesWell}
                    onChange={(e) => setNotesWell(e.target.value)}
                    placeholder="e.g. Energy was high, hit all my protein goals, chest presses felt stronger..."
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    What challenges or bottlenecks did you face?
                  </label>
                  <textarea
                    rows={3}
                    value={notesChallenging}
                    onChange={(e) => setNotesChallenging(e.target.value)}
                    placeholder="e.g. Knee felt a bit tight on lunges, struggled to prep meals on Thursday..."
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Progress Photo */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Optional: Weekly Progress Photo
                </label>
                <div className="flex items-center gap-4 bg-slate-950/40 p-4 border border-slate-850 rounded-2xl">
                  {imagePreview ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-md">
                      <img src={imagePreview} alt="Progress Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-500 text-white rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/30 rounded-xl flex items-center justify-center cursor-pointer text-slate-400 transition-all">
                      <Camera className="w-6 h-6" />
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                  <div className="text-xxs text-slate-500">
                    <p className="font-semibold text-slate-400">Track visual gains</p>
                    <p className="mt-0.5">Gemini uses this image to cross-examine bodyfat ratios and adjust training.</p>
                  </div>
                </div>
              </div>

              {/* Submit btn */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-4 border border-transparent rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing check-in & adapting plan...
                    </>
                  ) : (
                    <>
                      Submit Check-in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Check-in History */
          <div className="space-y-6">
            {checkIns.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-xl">
                <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-200">No Check-ins Yet</h3>
                <p className="text-xs text-slate-500 mt-1">Submit your first check-in to track progress and update plans.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {checkIns.map((check, idx) => (
                  <div key={check.id} className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4 mb-4 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/10 rounded-xl text-blue-400 font-extrabold text-xs">
                          W{check.weekNumber}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-200 text-sm">Week {check.weekNumber} Review</h3>
                          <p className="text-slate-500 text-xxs mt-0.5">{new Date(check.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-350">
                        <span className="flex items-center gap-1">
                          <Weight className="w-3.5 h-3.5 text-blue-400" /> {check.weight} kg
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> E: {check.energy}/10
                        </span>
                        <span className="flex items-center gap-1">
                          <Smile className="w-3.5 h-3.5 text-emerald-400" /> M: {check.mood}/10
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs mt-4">
                      <div>
                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Adherence Summary</span>
                        <div className="space-y-1.5 mt-2">
                          <div className="flex justify-between">
                            <span className="text-slate-450">Workout:</span>
                            <span className={`font-semibold capitalize ${check.adherenceWorkout === 'yes' ? 'text-emerald-400' : check.adherenceWorkout === 'partial' ? 'text-amber-500' : 'text-red-400'}`}>
                              {check.adherenceWorkout}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-450">Nutrition:</span>
                            <span className={`font-semibold capitalize ${check.adherenceNutrition === 'yes' ? 'text-emerald-400' : check.adherenceNutrition === 'partial' ? 'text-amber-500' : 'text-red-400'}`}>
                              {check.adherenceNutrition}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Coach Adjustments</span>
                        <p className="text-slate-350 leading-relaxed mt-2 text-xxs whitespace-pre-line bg-slate-950/40 p-3 border border-slate-850 rounded-2xl">
                          {check.planAdjustments}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}