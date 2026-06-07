export function findPlanQualityIssues(plan) {
  const issues = [];
  const trainingDays = plan?.workoutPlan?.days?.filter((day) => !day.isRestDay) || [];

  trainingDays.forEach((day) => {
    const label = day.dayName || `Day ${day.dayNumber || ''}`.trim();
    if ((day.exercises || []).length < 7) {
      issues.push(`${label} has fewer than 7 exercises`);
    }
    if (!Array.isArray(day.warmupSteps) || day.warmupSteps.length < 5) {
      issues.push(`${label} needs 5 detailed warm-up steps`);
    }
    if (!Array.isArray(day.cooldownSteps) || day.cooldownSteps.length < 5) {
      issues.push(`${label} needs 5 detailed cool-down steps`);
    }
    (day.exercises || []).forEach((exercise) => {
      if (!exercise.notes || exercise.notes.length < 80) {
        issues.push(`${label} ${exercise.name || 'exercise'} needs a full safety/coaching explanation`);
      }
      if (!exercise.tempo) issues.push(`${label} ${exercise.name || 'exercise'} needs tempo`);
      if (!exercise.targetMuscles) issues.push(`${label} ${exercise.name || 'exercise'} needs target muscles`);
    });
  });

  (plan?.weeklyMealPlan || []).forEach((day) => {
    (day.meals || []).forEach((meal) => {
      if (!meal.ingredients?.length) issues.push(`${day.dayName || 'A day'} ${meal.name || 'meal'} needs weighed ingredients`);
      if (!meal.prep) issues.push(`${day.dayName || 'A day'} ${meal.name || 'meal'} needs prep instructions`);
      if (!meal.whyThisMeal) issues.push(`${day.dayName || 'A day'} ${meal.name || 'meal'} needs a goal-specific reason`);
    });
  });

  return issues;
}

export async function repairThinPlan(plan, issues, callAI) {
  const repairPrompt = `
You are fixing a fitness and nutrition plan that is too thin.

Problems to fix:
${issues.map((issue) => `- ${issue}`).join('\n')}

Return ONLY the corrected full JSON object. Keep the same top-level structure, but expand it so:
- Every training day has at least 7 exercises.
- Every training day has warmupSteps with exactly 5 timed named movements.
- Every training day has cooldownSteps with exactly 5 timed named stretches/breathing drills.
- Every exercise has sets, reps, rest, tempo, targetMuscles, notes, and progressionNote.
- notes must explain safe setup, body position, breathing, range of motion, common mistakes, and when to stop.
- Warm-up and cool-down notes must explain how to perform each movement safely.
- Running/cardio instructions must include pace or RPE, posture, breathing, incline/speed guidance, and safety cues.
- Every meal has ingredients with gram/ml weights, prep, and whyThisMeal.
- Do not remove any existing client-specific restrictions.

Current JSON:
${JSON.stringify(plan)}
`;

  const responseText = await callAI(repairPrompt);
  const cleanJson = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}
