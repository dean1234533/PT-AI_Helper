import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useIsManagedClient } from '../hooks/useIsManagedClient';
import { usePlans } from '../hooks/usePlans';
import { useGemini } from '../contexts/GeminiContext';
import {
  Sparkles,
  TrendingUp,
  Target,
  Utensils,
  Dumbbell,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  PieChart,
  Camera,
  Upload,
  X,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

export default function BodyAnalysis() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useProfile();
  const isManagedClient = useIsManagedClient();
  const { analysis, saveAnalysis } = usePlans();
  const { callAI } = useGemini();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(profile.photoBase64 ? `data:image/jpeg;base64,${profile.photoBase64}` : null);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      setImagePreview(reader.result);
      saveProfile({ photoBase64: base64 });
      toast.success('Photo saved — click Re-Analyse to update your body type assessment');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setImagePreview(null);
    saveProfile({ photoBase64: null });
    toast('Photo removed');
  };

  const performAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const hasPhoto = !!profile.photoBase64;
      
      const prompt = `
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

      const responseText = await callAI(
        prompt,
        profile.photoBase64 || null,
        'image/jpeg'
      );

      // Clean up response text if Gemini wraps it in markdown blocks
      const cleanJson = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);
      
      // Validate macros sum to 100
      const sum = (result.macros?.protein || 0) + (result.macros?.carbs || 0) + (result.macros?.fat || 0);
      if (sum !== 100 && result.macros) {
        // Normalize if they don't sum to 100
        const total = sum || 1;
        result.macros.protein = Math.round((result.macros.protein / total) * 100);
        result.macros.carbs = Math.round((result.macros.carbs / total) * 100);
        result.macros.fat = 100 - result.macros.protein - result.macros.carbs;
      }

      saveAnalysis(result);
      toast.success('Body type analysis complete!');
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('settings')) {
        setError(isManagedClient ? 'Something needs to be set up — please contact your trainer.' : 'Your AI key needs to be set up. Please go to Settings and add your API key.');
      } else if (msg.toLowerCase().includes('busy') || msg.toLowerCase().includes('rate')) {
        setError(isManagedClient ? 'The service is busy right now. Please wait a moment and try again.' : 'The AI service is busy right now. Please wait a moment and try again.');
      } else {
        setError('We couldn\'t complete the analysis right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!analysis && profile.profileComplete) {
      performAnalysis();
    }
  }, [profile, analysis]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-brand-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <Sparkles className="w-8 h-8 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Analyzing Body Type & Metrics
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              {isManagedClient
                ? "Your trainer's process is examining your height, weight, goals, and photo to formulate your custom bio-blueprint..."
                : 'Gemini AI is examining your height, weight, goals, and photo to formulate your custom bio-blueprint...'}
            </p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl text-left text-xs text-slate-500">
            <p className="font-semibold text-slate-400 mb-1">Scientific Tip:</p>
            Adjusting nutritional ratios to match somatic features (like ectomorph or endomorph skeletal structures) boosts energy levels, accelerates metabolic responses, and keeps strength gains consistent.
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="p-4 bg-red-950/20 border border-red-950 rounded-2xl text-red-400 flex flex-col items-center gap-3">
            <h2 className="font-bold text-lg">Analysis Failed</h2>
            <p className="text-sm text-red-300/80">{error}</p>
          </div>
          <button
            onClick={performAnalysis}
            className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-2xl mx-auto transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <p className="text-slate-400 text-sm">Please set up your profile first.</p>
        <button
          onClick={() => navigate('/setup/profile')}
          className="mt-4 px-4 py-2 bg-brand-600 rounded-xl text-xs font-semibold"
        >
          Go to Profile Setup
        </button>
      </div>
    );
  }

  const { bodyType, explanation, eat, avoid, macros, workoutStyle, timeline } = analysis;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 relative overflow-hidden">
      <SEO title="Body Analysis" noIndex />
      {/* Glow decorations */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 pt-12">
        <div className="border-b border-slate-800 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              {isManagedClient ? 'Your Bio-Blueprint' : 'Your AI Bio-Blueprint'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isManagedClient
                ? "Your trainer's evaluation: somatic diagnosis and baseline metrics."
                : 'Gemini Vision & metrics evaluation: somatic diagnosis and baseline metrics.'}
            </p>
          </div>
          <button
            onClick={performAnalysis}
            className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/60 rounded-xl text-xs font-semibold hover:text-white text-slate-350 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-Analyse
          </button>
        </div>

        {/* Photo Upload Section */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl mb-8">
          <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
            <Camera className="w-4 h-4 text-brand-400" />
            Full Body Photo (Recommended)
          </h3>
          <p className="text-slate-500 text-xs mb-4">
            {isManagedClient
              ? "Upload a full body photo so your trainer's process can visually confirm your body type. A front-facing, full-length photo in fitted clothing gives the most accurate result."
              : 'Upload a full body photo so Gemini Vision can visually confirm your body type. A front-facing, full-length photo in fitted clothing gives the most accurate result.'}
          </p>
          <div className="flex items-center gap-6">
            {imagePreview ? (
              <div className="relative flex-shrink-0">
                <img
                  src={imagePreview}
                  alt="Body analysis photo"
                  className="w-28 h-36 object-cover rounded-2xl border border-brand-500/30 shadow-lg"
                />
                <button
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-md transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-emerald-600/80 rounded-lg py-1">
                  <CheckCircle className="w-3 h-3 text-white" />
                  <span className="text-white text-[9px] font-bold">Photo loaded</span>
                </div>
              </div>
            ) : (
              <label className="w-28 h-36 bg-slate-900 hover:bg-slate-800 border-2 border-dashed border-slate-700 hover:border-brand-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group">
                <Upload className="w-7 h-7 text-slate-600 group-hover:text-brand-400 transition-colors mb-2" />
                <span className="text-slate-500 group-hover:text-slate-300 text-[10px] font-semibold transition-colors">Upload Photo</span>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
            <div className="space-y-2 text-xs text-slate-400">
              <p>• Stand facing the camera, arms slightly away from body</p>
              <p>• Use good lighting — natural light works best</p>
              <p>• {isManagedClient ? 'Fitted clothing helps ensure an accurate assessment' : 'Fitted clothing helps the AI assess your build accurately'}</p>
              <p>• JPG or PNG, max 5MB</p>
              <p className="text-brand-400 font-semibold">Your photo is only stored locally on your device — never uploaded to any server.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Body type Diagnosis Card */}
          <div className="md:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 bg-brand-600/10 border border-brand-500/20 rounded-full text-brand-400 text-xs font-extrabold uppercase tracking-wider">
                  Diagnosis
                </span>
                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> Direct Somatotyping
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">{bodyType}</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{explanation}</p>
            </div>

            <div className="mt-8 border-t border-slate-800/60 pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-600/10 rounded-xl text-emerald-400 mt-0.5">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Workout Approach</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{workoutStyle}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-600/10 rounded-xl text-brand-400 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Realistic Timeline</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{timeline}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Macro Split Chart Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Macro Targets</h3>
              </div>

              {/* Pure CSS/HTML Macro Pie/Donut Visualization */}
              <div className="relative w-44 h-44 mx-auto my-6 flex items-center justify-center">
                {/* Visual donut using CSS gradients */}
                <div
                  className="w-full h-full rounded-full transition-all duration-500"
                  style={{
                    background: `conic-gradient(
                      #7c3aed 0% ${macros?.protein || 30}%, 
                      #10b981 ${macros?.protein || 30}% ${(macros?.protein || 30) + (macros?.carbs || 40)}%, 
                      #f59e0b ${(macros?.protein || 30) + (macros?.carbs || 40)}% 100%
                    )`,
                  }}
                >
                  {/* Center cutout */}
                  <div className="absolute inset-4 bg-slate-950 rounded-full flex flex-col items-center justify-center">
                    <span className="text-xxs text-slate-500 uppercase font-semibold">TDEE Ratio</span>
                    <span className="text-base font-black text-white">{macros?.protein}% P</span>
                  </div>
                </div>
              </div>

              {/* Legends */}
              <div className="space-y-2.5 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-brand-600"></div>
                    <span className="text-slate-400 font-medium">Protein (4 kcal/g)</span>
                  </div>
                  <span className="font-bold text-slate-200">{macros?.protein}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-400 font-medium">Carbohydrates (4 kcal/g)</span>
                  </div>
                  <span className="font-bold text-slate-200">{macros?.carbs}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-slate-400 font-medium">Fats (9 kcal/g)</span>
                  </div>
                  <span className="font-bold text-slate-200">{macros?.fat}%</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center mt-6">
              Optimal baseline distribution for {profile.goal?.toLowerCase()} as an {bodyType?.toLowerCase()}.
            </p>
          </div>
        </div>

        {/* Nutritional Blueprint */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Foods to Eat */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Utensils className="w-5 h-5 text-emerald-400" />
              Foods to Integrate
            </h3>
            <ul className="space-y-3">
              {eat?.map((food, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
                  <span>{food}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Foods to Avoid */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Utensils className="w-5 h-5 text-red-400" />
              Foods to Avoid / Minimize
            </h3>
            <ul className="space-y-3">
              {avoid?.map((food, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>
                  <span>{food}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Next step prompt */}
        <div className="mt-12 bg-gradient-to-r from-brand-900/30 to-emerald-950/20 border border-slate-800/80 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-slate-150 text-base">Your bio-profile is fully calibrated.</h3>
            <p className="text-xs text-slate-400 mt-1">
              Ready to compile your customized workout routines and nutritional scheduling.
            </p>
          </div>
          <button
            onClick={() => navigate('/plan')}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-semibold text-sm rounded-2xl shadow-lg transition-all group"
          >
            Generate My Plan
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
