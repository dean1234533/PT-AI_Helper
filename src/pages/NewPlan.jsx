import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { useClients } from '../hooks/useClients';
import { usePlans } from '../hooks/usePlans';
import { useSubscription } from '../contexts/SubscriptionContext';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Input, { Select, Textarea } from '../components/ui/Input';
import UpgradeModal from '../components/UpgradeModal';
import SEO from '../components/SEO';
import { CheckCircle, Upload, X, Dumbbell, Apple, User, Heart, Moon, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

const TOTAL_STEPS = 6;

const goals = [
  'Weight Loss', 'Muscle Gain', 'Body Recomposition', 'Athletic Performance',
  'General Health & Fitness', 'Marathon / Endurance', 'Strength & Power', 'Flexibility & Mobility',
];

const medicalList = [
  'Type 1 Diabetes', 'Type 2 Diabetes', 'High Blood Pressure', 'Heart Condition',
  'Asthma', 'Thyroid Condition', 'Osteoporosis', 'Arthritis', 'PCOS', 'Depression / Anxiety',
];

const allergyList = [
  'Gluten', 'Lactose / Dairy', 'Nuts', 'Peanuts', 'Eggs', 'Soy',
  'Shellfish', 'Fish', 'Nightshades',
];

const dietaryStyles = [
  'Omnivore (eats everything)', 'Vegetarian', 'Vegan', 'Pescatarian',
  'Keto / Low Carb', 'Paleo', 'Mediterranean', 'Halal', 'Kosher',
];

const equipmentList = [
  'Barbell & Plates', 'Dumbbells', 'Resistance Bands', 'Kettlebells',
  'Pull-up Bar', 'Cardio Machine (treadmill/bike)', 'Full Commercial Gym', 'Bodyweight Only',
  'TRX / Suspension', 'Cable Machine',
];

const workoutTypes = [
  'Weight Training', 'HIIT', 'Cardio / Running', 'Cycling', 'Swimming',
  'Yoga / Pilates', 'Sports / Team Sport', 'CrossFit', 'Martial Arts', 'Circuit Training',
];

const defaultForm = {
  clientId: '', clientName: '', clientEmail: '', isNewClient: false,
  age: '', gender: '', heightCm: '', weightKg: '', goalWeightKg: '',
  primaryGoal: '', secondaryGoal: '', timeline: '',
  medicalConditions: [], medicalOther: '', injuries: '',
  allergies: [], allergyOther: '', medications: '',
  activityLevel: '', occupation: '', sleepHours: '7', stressLevel: '5',
  smokingStatus: 'no', alcoholFrequency: 'rarely',
  dietaryStyle: '', mealsPerDay: '3', foodsToExclude: '',
  cookingSkill: '', cookingTime: '', foodBudget: '',
  fitnessLevel: '', equipment: [], workoutDaysPerWeek: '4',
  sessionDuration: '60', preferredWorkoutTypes: [], exercisesToAvoid: '',
  photoFile: null, photoUrl: '',
  additionalNotes: '',
};

function StepIndicator({ step }) {
  const steps = [
    { icon: User, label: 'Client' },
    { icon: Heart, label: 'Goals & Health' },
    { icon: Moon, label: 'Lifestyle' },
    { icon: Apple, label: 'Diet' },
    { icon: Dumbbell, label: 'Fitness' },
    { icon: Camera, label: 'Photo' },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex flex-col items-center gap-1`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-accent-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-brand-600' : done ? 'text-accent-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mb-4 transition-all ${step > num ? 'bg-accent-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckboxGroup({ options, selected, onChange }) {
  const toggle = (val) =>
    onChange(selected.includes(val) ? selected.filter((x) => x !== val) : [...selected, val]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => (
        <label key={opt} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
          selected.includes(opt) ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
        }`}>
          <input type="checkbox" className="hidden" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
          <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${selected.includes(opt) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
            {selected.includes(opt) && <CheckCircle className="w-3 h-3 text-white" />}
          </span>
          {opt}
        </label>
      ))}
    </div>
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label key={opt.value || opt} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
          value === (opt.value || opt) ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
        }`}>
          <input type="radio" className="hidden" value={opt.value || opt} checked={value === (opt.value || opt)} onChange={() => onChange(opt.value || opt)} />
          <span className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${value === (opt.value || opt) ? 'border-brand-600' : 'border-gray-300'}`}>
            {value === (opt.value || opt) && <span className="w-2 h-2 rounded-full bg-brand-600" />}
          </span>
          <div>
            <p className={`text-sm font-medium ${value === (opt.value || opt) ? 'text-brand-700' : 'text-gray-700'}`}>{opt.label || opt}</p>
            {opt.desc && <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>}
          </div>
        </label>
      ))}
    </div>
  );
}

// Step 1: Client Info
function Step1({ form, set, clients }) {
  const [mode, setMode] = useState(form.clientId ? 'existing' : 'new');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Who is this plan for?</h2>
        <p className="text-gray-500 text-sm mt-1">Select an existing client or create a new one.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setMode('existing')} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${mode === 'existing' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          Existing Client
        </button>
        <button onClick={() => setMode('new')} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${mode === 'new' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          New Client
        </button>
      </div>

      {mode === 'existing' ? (
        <Select label="Select client" value={form.clientId} onChange={(e) => {
          const c = clients.find((x) => x.id === e.target.value);
          if (c) set({ clientId: c.id, clientName: c.name, clientEmail: c.email, isNewClient: false });
        }}>
          <option value="">— Choose a client —</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
        </Select>
      ) : (
        <div className="space-y-4">
          <Input label="Client full name" value={form.clientName} onChange={(e) => set({ clientName: e.target.value, isNewClient: true })} placeholder="Jane Smith" required />
          <Input label="Client email" type="email" value={form.clientEmail} onChange={(e) => set({ clientEmail: e.target.value })} placeholder="jane@example.com" required />
        </div>
      )}
    </div>
  );
}

// Step 2: Goals & Health
function Step2({ form, set }) {
  const toggleMedical = (v) => set({ medicalConditions: form.medicalConditions.includes(v) ? form.medicalConditions.filter((x) => x !== v) : [...form.medicalConditions, v] });
  const toggleAllergy = (v) => set({ allergies: form.allergies.includes(v) ? form.allergies.filter((x) => x !== v) : [...form.allergies, v] });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Personal Details & Goals</h2>
        <p className="text-gray-500 text-sm mt-1">Basic stats and what they want to achieve.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Age" type="number" min="16" max="90" value={form.age} onChange={(e) => set({ age: e.target.value })} placeholder="32" required />
        <Select label="Gender" value={form.gender} onChange={(e) => set({ gender: e.target.value })} required>
          <option value="">Select...</option>
          <option>Male</option>
          <option>Female</option>
          <option>Non-binary / Other</option>
          <option>Prefer not to say</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Height (cm)" type="number" value={form.heightCm} onChange={(e) => set({ heightCm: e.target.value })} placeholder="170" />
        <Input label="Current weight (kg)" type="number" value={form.weightKg} onChange={(e) => set({ weightKg: e.target.value })} placeholder="75" />
        <Input label="Goal weight (kg)" type="number" value={form.goalWeightKg} onChange={(e) => set({ goalWeightKg: e.target.value })} placeholder="70" hint="Optional" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Primary goal *" value={form.primaryGoal} onChange={(e) => set({ primaryGoal: e.target.value })} required>
          <option value="">Select goal...</option>
          {goals.map((g) => <option key={g}>{g}</option>)}
        </Select>
        <Select label="Secondary goal" value={form.secondaryGoal} onChange={(e) => set({ secondaryGoal: e.target.value })}>
          <option value="">None</option>
          {goals.map((g) => <option key={g}>{g}</option>)}
        </Select>
      </div>

      <Select label="Timeline to reach goal" value={form.timeline} onChange={(e) => set({ timeline: e.target.value })}>
        <option value="">Not specified</option>
        <option>4 weeks</option>
        <option>8 weeks</option>
        <option>3 months</option>
        <option>6 months</option>
        <option>12 months</option>
        <option>Ongoing / lifestyle change</option>
      </Select>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Medical conditions (tick all that apply)</label>
        <CheckboxGroup options={medicalList} selected={form.medicalConditions} onChange={(v) => set({ medicalConditions: v })} />
        <Input className="mt-2" value={form.medicalOther} onChange={(e) => set({ medicalOther: e.target.value })} placeholder="Other conditions..." />
      </div>

      <Textarea label="Injuries or physical limitations" value={form.injuries} onChange={(e) => set({ injuries: e.target.value })} placeholder="e.g. Bad left knee, lower back pain..." rows={2} />

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Food allergies / intolerances</label>
        <CheckboxGroup options={allergyList} selected={form.allergies} onChange={(v) => set({ allergies: v })} />
        <Input className="mt-2" value={form.allergyOther} onChange={(e) => set({ allergyOther: e.target.value })} placeholder="Other allergies..." />
      </div>

      <Input label="Current medications (if relevant to diet/exercise)" value={form.medications} onChange={(e) => set({ medications: e.target.value })} placeholder="e.g. Metformin, Beta blockers..." hint="Optional" />
    </div>
  );
}

// Step 3: Lifestyle
function Step3({ form, set }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Lifestyle & Daily Habits</h2>
        <p className="text-gray-500 text-sm mt-1">Understanding their day helps tailor the plan.</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Current activity level *</label>
        <RadioGroup
          value={form.activityLevel}
          onChange={(v) => set({ activityLevel: v })}
          options={[
            { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little to no exercise' },
            { value: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
            { value: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
            { value: 'very', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
            { value: 'athlete', label: 'Athlete / Extremely Active', desc: 'Professional sport or very physical job + daily training' },
          ]}
        />
      </div>

      <Input label="Occupation / job type" value={form.occupation} onChange={(e) => set({ occupation: e.target.value })} placeholder="e.g. Office worker, Nurse, Builder, Teacher..." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Average sleep per night" value={form.sleepHours} onChange={(e) => set({ sleepHours: e.target.value })}>
          {['Less than 5', '5', '6', '7', '8', '9', '10+'].map((v) => <option key={v} value={v}>{v} hours</option>)}
        </Select>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Stress level: {form.stressLevel}/10</label>
          <input type="range" min="1" max="10" value={form.stressLevel} onChange={(e) => set({ stressLevel: e.target.value })} className="w-full accent-brand-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Very relaxed</span>
            <span>Very stressed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Smoking status" value={form.smokingStatus} onChange={(e) => set({ smokingStatus: e.target.value })}>
          <option value="no">Non-smoker</option>
          <option value="ex">Ex-smoker</option>
          <option value="occasional">Occasional smoker</option>
          <option value="yes">Regular smoker</option>
        </Select>
        <Select label="Alcohol consumption" value={form.alcoholFrequency} onChange={(e) => set({ alcoholFrequency: e.target.value })}>
          <option value="never">Never</option>
          <option value="rarely">Rarely (special occasions)</option>
          <option value="weekly">1-2 drinks per week</option>
          <option value="several">3-7 drinks per week</option>
          <option value="daily">Daily</option>
        </Select>
      </div>
    </div>
  );
}

// Step 4: Diet & Nutrition
function Step4({ form, set }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Diet & Nutrition Preferences</h2>
        <p className="text-gray-500 text-sm mt-1">What they eat and how they approach food.</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Dietary style *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dietaryStyles.map((d) => (
            <label key={d} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-sm transition-all ${form.dietaryStyle === d ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
              <input type="radio" className="hidden" value={d} checked={form.dietaryStyle === d} onChange={() => set({ dietaryStyle: d })} />
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${form.dietaryStyle === d ? 'border-brand-600' : 'border-gray-300'}`}>
                {form.dietaryStyle === d && <span className="w-2 h-2 rounded-full bg-brand-600" />}
              </span>
              {d}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Meals per day" value={form.mealsPerDay} onChange={(e) => set({ mealsPerDay: e.target.value })}>
          <option value="2">2 meals</option>
          <option value="3">3 meals</option>
          <option value="4">4 meals</option>
          <option value="5">5 meals</option>
          <option value="6">6 meals (bodybuilder style)</option>
        </Select>
        <Select label="Cooking skill level" value={form.cookingSkill} onChange={(e) => set({ cookingSkill: e.target.value })}>
          <option value="">Select...</option>
          <option value="basic">Basic (simple recipes only)</option>
          <option value="intermediate">Intermediate (comfortable cooking)</option>
          <option value="advanced">Advanced (enjoys cooking)</option>
        </Select>
      </div>

      <Select label="Time available to cook each day" value={form.cookingTime} onChange={(e) => set({ cookingTime: e.target.value })}>
        <option value="">Select...</option>
        <option value="minimal">Minimal (under 15 min — quick meals/prep)</option>
        <option value="moderate">Moderate (15–30 min per meal)</option>
        <option value="good">Good (30–60 min, happy to meal prep)</option>
        <option value="lots">Lots of time, enjoys cooking</option>
      </Select>

      <Textarea label="Foods they dislike or want to avoid" value={form.foodsToExclude} onChange={(e) => set({ foodsToExclude: e.target.value })} placeholder="e.g. Mushrooms, liver, anchovies, broccoli..." rows={2} />

      <Select label="Weekly food budget (rough guide)" value={form.foodBudget} onChange={(e) => set({ foodBudget: e.target.value })}>
        <option value="">Not specified</option>
        <option value="tight">Tight budget — keep it cheap</option>
        <option value="moderate">Moderate — normal supermarket shop</option>
        <option value="flexible">Flexible — quality over cost</option>
        <option value="premium">Premium — spare no expense</option>
      </Select>
    </div>
  );
}

// Step 5: Fitness
function Step5({ form, set }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Fitness Background</h2>
        <p className="text-gray-500 text-sm mt-1">Their training history and what they have access to.</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Current fitness / training level *</label>
        <RadioGroup
          value={form.fitnessLevel}
          onChange={(v) => set({ fitnessLevel: v })}
          options={[
            { value: 'beginner', label: 'Beginner', desc: 'Never trained consistently before, or returning after a long break' },
            { value: 'intermediate', label: 'Intermediate', desc: 'Training consistently for 6+ months, knows the basics' },
            { value: 'advanced', label: 'Advanced', desc: '2+ years consistent training, good technical knowledge' },
          ]}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Equipment available (tick all that apply)</label>
        <CheckboxGroup options={equipmentList} selected={form.equipment} onChange={(v) => set({ equipment: v })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Workout days per week: {form.workoutDaysPerWeek}</label>
          <input type="range" min="1" max="7" value={form.workoutDaysPerWeek} onChange={(e) => set({ workoutDaysPerWeek: e.target.value })} className="w-full accent-brand-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 day</span>
            <span>7 days</span>
          </div>
        </div>
        <Select label="Session duration (mins)" value={form.sessionDuration} onChange={(e) => set({ sessionDuration: e.target.value })}>
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">60 minutes</option>
          <option value="75">75 minutes</option>
          <option value="90">90 minutes</option>
          <option value="120">2 hours+</option>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Preferred workout styles (tick all that apply)</label>
        <CheckboxGroup options={workoutTypes} selected={form.preferredWorkoutTypes} onChange={(v) => set({ preferredWorkoutTypes: v })} />
      </div>

      <Textarea label="Exercises to avoid" value={form.exercisesToAvoid} onChange={(e) => set({ exercisesToAvoid: e.target.value })} placeholder="e.g. No running (knee), no overhead press (shoulder injury)..." rows={2} />

      <Textarea label="Additional notes for the AI" value={form.additionalNotes} onChange={(e) => set({ additionalNotes: e.target.value })} placeholder="Anything else the AI should know when creating the plan..." rows={3} />
    </div>
  );
}

// Step 6: Photo & Generate
function Step6({ form, set, onGenerate, generating }) {
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    set({ photoFile: file, photoUrl: URL.createObjectURL(file) });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Photo & Generate</h2>
        <p className="text-gray-500 text-sm mt-1">Optionally upload a photo for AI body composition analysis, then generate the plan.</p>
      </div>

      {!form.photoUrl ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${dragging ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-600">Drag & drop a photo, or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG — optional but improves accuracy</p>
          <input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={(e) => handleFile(e.target.files[0])} />
          <Button size="sm" variant="secondary" className="mt-4 cursor-pointer" type="button" onClick={() => document.getElementById('photo-upload').click()}>Choose Photo</Button>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          <img src={form.photoUrl} alt="Client" className="w-full max-h-64 object-cover" />
          <button
            onClick={() => set({ photoFile: null, photoUrl: '' })}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-600">
        <p className="font-semibold text-gray-800">Ready to generate for {form.clientName}</p>
        <p>Goal: <span className="font-medium text-gray-900">{form.primaryGoal || 'Not specified'}</span></p>
        <p>Fitness level: <span className="font-medium text-gray-900">{form.fitnessLevel || 'Not specified'}</span></p>
        <p>Diet style: <span className="font-medium text-gray-900">{form.dietaryStyle || 'Not specified'}</span></p>
        <p>Training days: <span className="font-medium text-gray-900">{form.workoutDaysPerWeek} days/week</span></p>
      </div>

      {generating && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg className="w-6 h-6 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="font-semibold text-brand-800">AI is building the plan...</p>
          </div>
          <p className="text-brand-600 text-sm">Analysing questionnaire, pulling nutrition data, and creating a personalised plan. This takes 20–60 seconds.</p>
        </div>
      )}

      <Button onClick={onGenerate} size="lg" className="w-full" loading={generating} disabled={!form.clientName || !form.primaryGoal}>
        Generate Plan with AI
      </Button>
    </div>
  );
}

export default function NewPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, addClient } = useClients();
  const { savePlan } = usePlans();
  const { canCreate, incrementUsage } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const initState = location.state
    ? { ...defaultForm, clientId: location.state.clientId || '', clientName: location.state.clientName || '', clientEmail: location.state.clientEmail || '' }
    : { ...defaultForm };

  const [step, setStep] = useState(1);
  const [form, setFormState] = useState(initState);
  const [generating, setGenerating] = useState(false);

  const set = useCallback((patch) => setFormState((f) => ({ ...f, ...patch })), []);

  const canAdvance = () => {
    if (step === 1) return form.clientName && form.clientEmail;
    if (step === 2) return form.age && form.gender && form.primaryGoal;
    if (step === 3) return form.activityLevel;
    if (step === 4) return form.dietaryStyle;
    if (step === 5) return form.fitnessLevel;
    return true;
  };

  const handleGenerate = async () => {
    if (!canCreate) { setShowUpgrade(true); return; }
    setGenerating(true);
    try {
      let photoUrl = '';
      if (form.photoFile) {
        try {
          const fileRef = ref(storage, `client-photos/${Date.now()}-${form.photoFile.name}`);
          await uploadBytes(fileRef, form.photoFile);
          photoUrl = await getDownloadURL(fileRef);
        } catch (uploadErr) {
          console.warn('Photo upload failed, continuing without photo:', uploadErr);
        }
      }

      const questionnaire = { ...form, photoFile: undefined, photoUrl: undefined };

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire, photoUrl }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || 'Generation failed');
      }
      const { plan } = await res.json();

      const savedPlan = await savePlan({
        clientId: form.clientId,
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        questionnaire,
        photoUrl,
        plan,
        status: 'draft',
        trainerNotes: '',
      });

      if (form.isNewClient) {
        await addClient({ name: form.clientName, email: form.clientEmail });
      }

      await incrementUsage();
      toast.success('Plan generated successfully!');
      navigate(`/plans/${savedPlan.id}/review`);
    } catch (err) {
      toast.error('Failed to generate plan. Please try again.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const stepProps = { form, set };

  return (
    <Layout>
      <SEO title="Create New Plan" noIndex />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <div className="p-4 sm:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create New Plan</h1>
          <p className="text-gray-500 text-sm mt-1">Step {step} of {TOTAL_STEPS}</p>
        </div>

        <StepIndicator step={step} />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-7">
          {step === 1 && <Step1 {...stepProps} clients={clients} />}
          {step === 2 && <Step2 {...stepProps} />}
          {step === 3 && <Step3 {...stepProps} />}
          {step === 4 && <Step4 {...stepProps} />}
          {step === 5 && <Step5 {...stepProps} />}
          {step === 6 && <Step6 {...stepProps} onGenerate={handleGenerate} generating={generating} />}
        </div>

        {step < TOTAL_STEPS && (
          <div className="flex justify-between mt-5">
            <Button variant="secondary" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
              Back
            </Button>
            <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
              Continue
            </Button>
          </div>
        )}
        {step === TOTAL_STEPS && !generating && (
          <div className="flex justify-start mt-5">
            <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
