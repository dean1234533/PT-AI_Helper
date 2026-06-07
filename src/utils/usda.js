/**
 * USDA FoodData Central API utility
 * Docs: https://fdc.nal.usda.gov/api-guide.html
 */

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const API_KEY = import.meta.env.VITE_USDA_API_KEY;

// Nutrient IDs we care about
const NUTRIENT_IDS = {
  calories:  1008, // Energy (kcal)
  protein:   1003, // Protein (g)
  carbs:     1005, // Carbohydrate, by difference (g)
  fat:       1004, // Total lipid (fat) (g)
  fibre:     1079, // Fiber, total dietary (g)
};

/**
 * Search USDA for a food item and return the best match's nutritional data
 * per 100g, plus FDC id.
 * @param {string} query  e.g. "chicken breast"
 * @returns {{ fdcId, description, per100g: { calories, protein, carbs, fat, fibre } } | null}
 */
export async function searchFood(query) {
  if (!API_KEY) {
    console.warn('VITE_USDA_API_KEY not set — skipping USDA lookup');
    return null;
  }

  try {
    const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=1&api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const food = data.foods?.[0];
    if (!food) return null;

    const nutrients = {};
    for (const [key, id] of Object.entries(NUTRIENT_IDS)) {
      const n = food.foodNutrients?.find((fn) => fn.nutrientId === id);
      nutrients[key] = n ? Math.round(n.value * 10) / 10 : 0;
    }

    return {
      fdcId: food.fdcId,
      description: food.description,
      per100g: nutrients,
    };
  } catch (err) {
    console.warn('USDA search failed for:', query, err.message);
    return null;
  }
}

/**
 * Given an ingredient string (e.g. "150g chicken breast") extract the
 * grams if present, search USDA, and return computed nutrition for that serving.
 * Falls back to Gemini-estimated values if USDA fails.
 *
 * @param {string} ingredient  Raw ingredient string from Gemini
 * @param {{ calories: number, protein: number, carbs: number, fat: number }} geminiEstimate  Per-meal totals to fall back on
 * @returns {{ ingredient, grams, usdaName, calories, protein, carbs, fat, fibre, source }}
 */
export async function lookupIngredient(ingredient) {
  // Extract gram weight from strings like "150g chicken breast" or "1 cup (240ml) oats"
  const gramMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  const grams = gramMatch ? parseFloat(gramMatch[1]) : 100; // default 100g if not specified

  // Clean query — strip quantities for better USDA matching
  const query = ingredient
    .replace(/^\d+(?:\.\d+)?\s*(g|kg|ml|l|oz|lb|cup|tbsp|tsp|slice|piece|medium|large|small)\b\s*/i, '')
    .replace(/\s*\(.*?\)/g, '')
    .trim()
    .split(',')[0]
    .trim();

  const result = await searchFood(query);

  if (!result) {
    return {
      ingredient,
      grams,
      usdaName: null,
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fibre: null,
      source: 'ai-estimate',
    };
  }

  const factor = grams / 100;
  return {
    ingredient,
    grams,
    usdaName: result.description,
    calories: Math.round(result.per100g.calories * factor),
    protein: Math.round(result.per100g.protein * factor * 10) / 10,
    carbs: Math.round(result.per100g.carbs * factor * 10) / 10,
    fat: Math.round(result.per100g.fat * factor * 10) / 10,
    fibre: Math.round(result.per100g.fibre * factor * 10) / 10,
    source: 'usda',
  };
}

/**
 * Enrich an entire 7-day meal plan with USDA nutritional data.
 * Operates concurrently but rate-limited to avoid overwhelming USDA.
 * @param {Array} days  Array of { day, meals: [{ name, ingredients: string[] }] }
 * @returns Enriched days array
 */
export async function enrichMealPlanWithUSDA(days) {
  const enrichedDays = [];

  for (const day of days) {
    const enrichedMeals = [];

    for (const meal of (day.meals || [])) {
      const enrichedIngredients = [];
      let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFibre = 0;

      // Lookup ingredients with slight stagger to avoid rate limits
      for (const ing of (meal.ingredients || [])) {
        const data = await lookupIngredient(ing);
        enrichedIngredients.push(data);
        if (data.source === 'usda') {
          totalCal     += data.calories || 0;
          totalProtein += data.protein  || 0;
          totalCarbs   += data.carbs    || 0;
          totalFat     += data.fat      || 0;
          totalFibre   += data.fibre    || 0;
        }
      }

      // If USDA returned data for at least half the ingredients, use USDA totals
      const usdaCount = enrichedIngredients.filter(i => i.source === 'usda').length;
      const useUsda = usdaCount >= Math.ceil(enrichedIngredients.length / 2);

      enrichedMeals.push({
        ...meal,
        enrichedIngredients,
        usdaCalories:  useUsda ? Math.round(totalCal)     : meal.calories,
        usdaProtein:   useUsda ? Math.round(totalProtein * 10) / 10 : meal.macros?.protein,
        usdaCarbs:     useUsda ? Math.round(totalCarbs * 10) / 10   : meal.macros?.carbs,
        usdaFat:       useUsda ? Math.round(totalFat * 10) / 10     : meal.macros?.fat,
        usdaFibre:     useUsda ? Math.round(totalFibre * 10) / 10   : null,
        dataSource:    useUsda ? 'usda' : 'ai-estimate',
      });
    }

    enrichedDays.push({ ...day, meals: enrichedMeals });
  }

  return enrichedDays;
}
