import { useLocalStorage } from './useLocalStorage';

export const CHECKINS_KEY = 'fitai_checkins';

export function useCheckIns() {
  const [checkIns, setCheckIns] = useLocalStorage(CHECKINS_KEY, []);

  const saveCheckIn = (data) => {
    const newCheckIn = {
      id: `checkin_${Date.now()}`,
      date: new Date().toISOString(),
      weekNumber: checkIns.length + 1,
      ...data,
    };
    const updated = [newCheckIn, ...checkIns];
    setCheckIns(updated);
    return newCheckIn;
  };

  const latestCheckIn = checkIns[0] || null;
  const previousCheckIn = checkIns[1] || null;
  const clearCheckIns = () => setCheckIns([]);

  return {
    checkIns,
    latestCheckIn,
    previousCheckIn,
    saveCheckIn,
    clearCheckIns,
  };
}
