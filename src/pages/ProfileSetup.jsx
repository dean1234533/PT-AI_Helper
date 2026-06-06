import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useProfile } from '../hooks/useProfile';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  User,
  Activity,
  Dumbbell,
  Apple,
  Camera,
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  Upload,
  X,
  AlertCircle,
  Lock,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 'basic', title: 'Basic Info', icon: User },
  { id: 'goals', title: 'Fitness Goals', icon: Activity },
  { id: 'fitness', title: 'Training Preferences', icon: Dumbbell },
  { id: 'diet', title: 'Diet & Nutrition', icon: Apple },
  { id: 'photo', title: 'Body Analysis', icon: Camera },
];

const EQUIPMENT_OPTIONS = [
  'Full Gym Equipment',
  'Dumbbells Only',
  'Barbell & Plates',
  'Resistance Bands',
  'Kettlebell',
  'Bodyweight Only / No Equipment',
];

const WORKOUT_TYPES = [
  'Strength Training',
  'High-Intensity Interval Training (HIIT)',
  'Cardio / Endurance',
  'Yoga & Flexibility',
  'Pilates',
  'Calisthenics',
];

const DIETARY_STYLES = [
  { value: 'everything', label: 'Balanced / Anything' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo / Primal' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'low-carb', label: 'Low Carb' },
];

const ALLERGIES_OPTIONS = [
  'Nuts',
  'Dairy',
  'Gluten / Wheat',
  'Soy',
  'Shellfish',
  'Eggs',
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, saveProfile } = useProfile();
  
  const isEditMode = location.pathname === '/profile';
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(profile);
  const [imagePreview, setImagePreview] = useState(profile.photoBase64 ? `data:image/jpeg;base64,${profile.photoBase64}` : null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        toast.success('Password updated successfully!');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        toast.error('No user logged in');
      }
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign back in to modify password.');
      } else {
        toast.error(err.message || 'Failed to update password');
      }
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    setFormData(profile);
    if (profile.photoBase64) {
      setImagePreview(`data:image/jpeg;base64,${profile.photoBase64}`);
    }
  }, [profile]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleList = (field, value) => {
    setFormData((prev) => {
      const currentList = prev[field] || [];
      const updatedList = currentList.includes(value)
        ? currentList.filter((item) => item !== value)
        : [...currentList, value];
      return { ...prev, [field]: updatedList };
    });
  };

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
      handleChange('photoBase64', base64String);
      setImagePreview(reader.result);
      toast.success('Photo uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    handleChange('photoBase64', null);
    setImagePreview(null);
  };

  const validateStep = (stepIdx) => {
    switch (stepIdx) {
      case 0:
        if (!formData.name?.trim()) return 'Name is required';
        if (!formData.age || formData.age <= 0) return 'Valid age is required';
        if (!formData.weight || formData.weight <= 0) return 'Valid weight is required';
        if (!formData.height || formData.height <= 0) return 'Valid height is required';
        if (!formData.gender) return 'Gender is required';
        return null;
      case 1:
        if (!formData.goal) return 'Main fitness goal is required';
        if (!formData.trainingDaysPerWeek || formData.trainingDaysPerWeek < 1 || formData.trainingDaysPerWeek > 7) {
          return 'Training days per week must be between 1 and 7';
        }
        return null;
      case 2:
        if (!formData.fitnessLevel) return 'Fitness level is required';
        if (!formData.equipment || formData.equipment.length === 0) return 'Select at least one equipment option';
        if (!formData.preferredWorkoutTypes || formData.preferredWorkoutTypes.length === 0) return 'Select at least one preferred workout type';
        return null;
      case 3:
        if (!formData.dietaryStyle) return 'Dietary style is required';
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSave = () => {
    const error = validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }

    const updated = saveProfile(formData);
    toast.success(isEditMode ? 'Profile updated!' : 'Profile created!');

    if (isEditMode) {
      // If photo changed and we are in edit mode, they can redo body analysis, else back to dashboard
      if (formData.photoBase64 !== profile.photoBase64) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">New photo uploaded. Analyze your body type?</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/analysis');
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold"
              >
                Analyze Body
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/dashboard');
                }}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-semibold"
              >
                Just Save
              </button>
            </div>
          </div>
        ), { duration: 6000 });
      } else {
        navigate('/dashboard');
      }
    } else {
      // If setup, redirect to body analysis page (whether photo uploaded or not, as it calculates macros/goals too)
      navigate('/analysis');
    }
  };

  const StepIcon = STEPS[currentStep].icon;

  const content = (
    <div className="min-h-screen bg-slate-950 text-white pb-16 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Profile Setup / Edit Header */}
      <div className="max-w-4xl mx-auto px-4 pt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              {isEditMode ? 'My Fitness Profile' : 'Set Up Your Profile'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isEditMode
                ? 'Keep your personal statistics and nutrition preferences up to date'
                : 'Help Gemini customize your workouts, macro distributions, and diets'}
            </p>
          </div>
          {isEditMode && (
            <button
              onClick={() => navigate('/dashboard')}
              className="self-start sm:self-center px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/60 rounded-xl text-xs font-semibold hover:text-white text-slate-350 transition-colors"
            >
              Cancel & Dashboard
            </button>
          )}
        </div>

        {/* Steps Progress bar (Only in onboarding, or if user wants to see it) */}
        <div className="mb-10">
          <div className="flex justify-between items-center relative">
            {/* Connecting lines */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 z-0"></div>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-blue-600 to-emerald-500 z-0 transition-all duration-300"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            ></div>

            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx < currentStep;
              const isActive = idx === currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    // Allow navigation to previously completed steps or if in edit mode
                    if (isEditMode || idx < currentStep || !validateStep(currentStep)) {
                      setCurrentStep(idx);
                    }
                  }}
                  className="relative z-10 flex flex-col items-center group focus:outline-none"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border ${
                      isCompleted
                        ? 'bg-gradient-to-tr from-blue-600 to-emerald-500 border-transparent text-white'
                        : isActive
                        ? 'bg-slate-900 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={`hidden sm:block text-xs font-medium mt-2 transition-all ${
                      isActive ? 'text-blue-400 font-bold' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Container */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl relative">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800/80 pb-4">
            <div className="p-2 bg-blue-600/10 rounded-xl text-blue-400">
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <h2 className="text-xl font-bold text-slate-100">{STEPS[currentStep].title}</h2>
            </div>
          </div>

          {/* STEP 1: BASIC INFO */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Name / Nickname
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Gender
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Male', 'Female', 'Other'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleChange('gender', g)}
                        className={`py-3 px-4 border text-sm font-semibold rounded-2xl transition-all ${
                          formData.gender === g
                            ? 'bg-gradient-to-tr from-blue-600 to-blue-700 border-transparent text-white'
                            : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => handleChange('age', e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    placeholder="e.g. 75"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={formData.height || ''}
                    onChange={(e) => handleChange('height', e.target.value)}
                    placeholder="e.g. 178"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GOALS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Main Fitness Goal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { val: 'Lose Fat', desc: 'Burn calories & trim excess fat' },
                    { val: 'Build Muscle', desc: 'Hypertrophy and mass building' },
                    { val: 'Tone Up', desc: 'Define muscles & lean conditioning' },
                    { val: 'Cardiovascular Health', desc: 'Enhance heart fitness & stamina' },
                    { val: 'Improve Strength', desc: 'Increase raw lifts & power output' },
                    { val: 'Flexibility & Core', desc: 'Improve posture, core, & flexibility' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleChange('goal', item.val)}
                      className={`p-4 border text-left rounded-2xl transition-all flex flex-col gap-1 ${
                        formData.goal === item.val
                          ? 'bg-gradient-to-tr from-blue-600 to-blue-700 border-transparent text-white ring-2 ring-blue-400/35'
                          : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-semibold text-sm">{item.val}</span>
                      <span className={`text-xs ${formData.goal === item.val ? 'text-blue-200' : 'text-slate-500'}`}>
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Training Days per Week
                  </label>
                  <div className="flex gap-2 justify-between">
                    {[2, 3, 4, 5, 6].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleChange('trainingDaysPerWeek', String(days))}
                        className={`flex-1 py-3 text-sm font-semibold rounded-2xl transition-all ${
                          formData.trainingDaysPerWeek === String(days)
                            ? 'bg-emerald-600 text-white font-bold border-transparent'
                            : 'bg-slate-950/40 border border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {days}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Session Duration (Minutes)
                  </label>
                  <select
                    value={formData.sessionDuration || '60'}
                    onChange={(e) => handleChange('sessionDuration', e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3.5 px-4 text-slate-100 text-sm outline-none transition-all cursor-pointer"
                  >
                    <option value="30">30 mins (Quick workouts)</option>
                    <option value="45">45 mins (Balanced workouts)</option>
                    <option value="60">60 mins (Standard workouts)</option>
                    <option value="75">75 mins (Extended volume)</option>
                    <option value="90">90 mins (Intense power/strength)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Target Timeline / Secondary Goal (Optional)
                </label>
                <input
                  type="text"
                  value={formData.secondaryGoal || ''}
                  onChange={(e) => handleChange('secondaryGoal', e.target.value)}
                  placeholder="e.g. Run a 5k in 2 months / Build upper body strength"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* STEP 3: FITNESS & EQUIPMENT */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Fitness Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'Beginner', desc: 'New to training' },
                    { value: 'Intermediate', desc: '1-3 years experience' },
                    { value: 'Advanced', desc: '3+ years structured training' },
                  ].map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => handleChange('fitnessLevel', level.value)}
                      className={`p-4 border rounded-2xl transition-all flex flex-col items-center gap-1 ${
                        formData.fitnessLevel === level.value
                          ? 'bg-gradient-to-tr from-blue-600 to-blue-700 border-transparent text-white ring-2 ring-blue-400/35'
                          : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-semibold text-sm">{level.value}</span>
                      <span className={`text-[10px] text-center ${formData.fitnessLevel === level.value ? 'text-blue-200' : 'text-slate-500'}`}>
                        {level.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Equipment Available (Select all that apply)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {EQUIPMENT_OPTIONS.map((equip) => {
                    const isSelected = formData.equipment?.includes(equip);
                    return (
                      <button
                        key={equip}
                        type="button"
                        onClick={() => handleToggleList('equipment', equip)}
                        className={`p-3 text-left border rounded-2xl transition-all text-xs font-semibold flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{equip}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Preferred Workout Styles (Select all that apply)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {WORKOUT_TYPES.map((type) => {
                    const isSelected = formData.preferredWorkoutTypes?.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleToggleList('preferredWorkoutTypes', type)}
                        className={`p-3 text-left border rounded-2xl transition-all text-xs font-semibold flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{type}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Injuries, Pains, or Exercises to Avoid (Optional)
                </label>
                <input
                  type="text"
                  value={formData.exercisesToAvoid || ''}
                  onChange={(e) => handleChange('exercisesToAvoid', e.target.value)}
                  placeholder="e.g. Lower back pain, avoid heavy squats / rotator cuff issues"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* STEP 4: DIET & NUTRITION */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Dietary Style / Philosophy
                  </label>
                  <select
                    value={formData.dietaryStyle || ''}
                    onChange={(e) => handleChange('dietaryStyle', e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3.5 px-4 text-slate-100 text-sm outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select a diet style</option>
                    {DIETARY_STYLES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Meals per Day
                  </label>
                  <div className="flex gap-2">
                    {['2', '3', '4', '5'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleChange('mealsPerDay', num)}
                        className={`flex-1 py-3 text-sm font-semibold rounded-2xl transition-all ${
                          formData.mealsPerDay === num
                            ? 'bg-emerald-600 text-white border-transparent'
                            : 'bg-slate-950/40 border border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Food Allergies & Intolerances (Select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ALLERGIES_OPTIONS.map((allergy) => {
                    const isSelected = formData.allergies?.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => handleToggleList('allergies', allergy)}
                        className={`p-3 text-left border rounded-2xl transition-all text-xs font-semibold flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{allergy}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Foods You Like (Helps make meal plans appetizing)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.foodsLiked || ''}
                    onChange={(e) => handleChange('foodsLiked', e.target.value)}
                    placeholder="e.g. Chicken, sweet potatoes, oats, avocados, eggs, berries"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Foods You Dislike / Avoid (Will be excluded)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.foodsDisliked || ''}
                    onChange={(e) => handleChange('foodsDisliked', e.target.value)}
                    placeholder="e.g. Broccoli, mushrooms, olives, fish"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Other Dietary Restrictions (Optional)
                </label>
                <input
                  type="text"
                  value={formData.dietaryRestrictions || ''}
                  onChange={(e) => handleChange('dietaryRestrictions', e.target.value)}
                  placeholder="e.g. Kosher, Halal, Lactose Intolerant, No pork"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* STEP 5: PHOTO FOR BODY ANALYSIS */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/60 flex gap-4">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 space-y-1">
                  <h4 className="font-semibold text-slate-200">Optional: AI Body Type Vision Analysis</h4>
                  <p>
                    Uploading a clear, full-body photo allows Gemini Vision to identify your body structure (ectomorph, mesomorph, endomorph, or combination) to perfectly calibrate your dietary plans, macro proportions, and timelines.
                  </p>
                  <p className="text-[10px] text-blue-400/80">
                    Your photo is processed locally in your browser and saved to your device's local storage. No data is sent to external databases.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-3xl p-8 bg-slate-950/20 transition-all relative">
                {imagePreview ? (
                  <div className="relative group max-w-xs w-full rounded-2xl overflow-hidden shadow-2xl">
                    <img
                      src={imagePreview}
                      alt="Profile Preview"
                      className="w-full h-72 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full cursor-pointer text-white shadow-lg transition-transform hover:scale-105">
                        <Upload className="w-5 h-5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={handleRemovePhoto}
                        type="button"
                        className="p-3 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg transition-transform hover:scale-105"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-64 cursor-pointer group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center space-y-3">
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 group-hover:shadow-lg group-hover:shadow-blue-500/5 transition-all">
                        <Camera className="w-8 h-8" />
                      </div>
                      <p className="text-sm text-slate-350 font-medium">
                        Click to upload full-body photo
                      </p>
                      <p className="text-xs text-slate-500">
                        PNG, JPG, or WEBP (Max 4MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-800/80">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-5 py-3 border border-slate-850 hover:border-slate-700 bg-slate-950/20 text-slate-400 hover:text-slate-200 text-sm font-semibold rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-blue-600/10 transition-all hover:shadow-blue-600/20"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-emerald-600/10 transition-all hover:shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" />
                {isEditMode ? 'Save Profile' : 'Complete Profile'}
              </button>
            )}
          </div>
        </div>

        {isEditMode && (
          <div className="mt-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Account Security</h2>
                <p className="text-xs text-slate-500 mt-0.5">Modify or update your login credentials securely.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-3 px-4 text-slate-100 text-sm outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white text-sm font-semibold rounded-2xl shadow-lg transition-all"
              >
                {pwLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    Update Password
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  if (isEditMode) {
    return <Layout>{content}</Layout>;
  }
  return content;
}
