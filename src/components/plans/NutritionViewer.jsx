import { useState } from 'react';
import { ChevronDown, ChevronUp, Droplets, ShoppingCart, Pill, ListChecks } from 'lucide-react';

function MacroBar({ label, grams, pct, color }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{grams}g <span className="text-xs">({pct}%)</span></span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MealRow({ meal, label }) {
  if (!meal) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase w-20 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm">{meal.name}</p>
        {meal.description && <p className="text-xs text-gray-500 mt-0.5">{meal.description}</p>}
      </div>
      <div className="text-right shrink-0 text-xs text-gray-500">
        <p className="font-medium text-gray-700">{meal.calories} kcal</p>
        {meal.protein && <p>{meal.protein}g protein</p>}
      </div>
    </div>
  );
}

function DayAccordion({ day, data }) {
  const [open, setOpen] = useState(false);
  const dayName = day.charAt(0).toUpperCase() + day.slice(1);
  const totalCals = [data.breakfast, data.lunch, data.dinner, ...(data.snacks || [])]
    .filter(Boolean)
    .reduce((sum, m) => sum + (m.calories || 0), 0);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800 text-sm">{dayName}</span>
          <span className="text-xs text-gray-400">~{totalCals} kcal</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-3 bg-gray-50/50">
          <MealRow meal={data.breakfast} label="Breakfast" />
          <MealRow meal={data.lunch} label="Lunch" />
          <MealRow meal={data.dinner} label="Dinner" />
          {data.snacks?.map((s, i) => <MealRow key={i} meal={s} label={`Snack ${i + 1}`} />)}
        </div>
      )}
    </div>
  );
}

export default function NutritionViewer({ plan }) {
  const n = plan.nutritionPlan;
  if (!n) return <p className="text-gray-500">No nutrition plan available.</p>;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="space-y-7">
      {/* Calorie & Macro Summary */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">🔥</span>
          Daily Targets
        </h3>
        <div className="bg-gradient-to-r from-brand-50 to-purple-50 rounded-xl p-5 mb-4">
          <p className="text-4xl font-bold text-brand-700 text-center">{n.dailyCalories?.toLocaleString()}</p>
          <p className="text-center text-sm text-gray-500 mt-1">calories per day</p>
        </div>
        <div className="space-y-3">
          <MacroBar label="Protein" grams={n.macros?.protein?.grams} pct={n.macros?.protein?.percentage} color="bg-brand-500" />
          <MacroBar label="Carbohydrates" grams={n.macros?.carbs?.grams} pct={n.macros?.carbs?.percentage} color="bg-accent-500" />
          <MacroBar label="Fats" grams={n.macros?.fats?.grams} pct={n.macros?.fats?.percentage} color="bg-yellow-400" />
        </div>
      </div>

      {/* Hydration */}
      {n.hydration && (
        <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
          <Droplets className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-900 text-sm">Hydration</p>
            <p className="text-blue-700 text-sm mt-0.5">{n.hydration}</p>
          </div>
        </div>
      )}

      {/* Meal Timing */}
      {n.mealTiming && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wide text-gray-500">Meal Timing Strategy</h3>
          <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-xl p-4">{n.mealTiming}</p>
        </div>
      )}

      {/* 7-Day Meal Plan */}
      {n.weeklyMealPlan && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">7-Day Meal Plan</h3>
          <div className="space-y-2">
            {days.filter((d) => n.weeklyMealPlan[d]).map((day) => (
              <DayAccordion key={day} day={day} data={n.weeklyMealPlan[day]} />
            ))}
          </div>
        </div>
      )}

      {/* Shopping List */}
      {n.shoppingList && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-accent-500" /> Shopping List
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(n.shoppingList).map(([category, items]) =>
              items?.length > 0 ? (
                <div key={category} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{category}</p>
                  <ul className="space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Supplements */}
      {n.supplements?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-500" /> Supplements
          </h3>
          <div className="space-y-2">
            {n.supplements.map((s, i) => (
              <div key={i} className="bg-purple-50 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-purple-900 text-sm">{s.name}</p>
                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{s.dosage}</span>
                </div>
                <p className="text-xs text-purple-700 mt-1">{s.reason}</p>
                {s.timing && <p className="text-xs text-purple-600 mt-0.5">When: {s.timing}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Rules */}
      {n.keyRules?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-brand-500" /> Key Nutrition Rules
          </h3>
          <ul className="space-y-2">
            {n.keyRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {n.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="font-semibold text-yellow-900 text-sm mb-1">Nutrition Notes</p>
          <p className="text-yellow-800 text-sm leading-relaxed">{n.notes}</p>
        </div>
      )}
    </div>
  );
}
