import { useLocalStorage } from './useLocalStorage';

export const PLANS_KEY = 'fitai_plans';
export const ANALYSIS_KEY = 'fitai_analysis';

export function usePlans() {
  const [plans, setPlans] = useLocalStorage(PLANS_KEY, []);
  const [analysis, setAnalysis] = useLocalStorage(ANALYSIS_KEY, null);

  const savePlan = (planData) => {
    const newPlan = {
      id: `plan_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      weekNumber: plans.length + 1,
      ...planData,
    };
    const updated = [newPlan, ...plans];
    setPlans(updated);
    return newPlan;
  };

  const saveAnalysis = (analysisData) => {
    const updated = {
      ...analysisData,
      generatedAt: new Date().toISOString(),
    };
    setAnalysis(updated);
    return updated;
  };

  const currentPlan = plans[0] || null;
  const clearPlans = () => { setPlans([]); setAnalysis(null); };

  return { plans, currentPlan, savePlan, analysis, saveAnalysis, clearPlans };
}
