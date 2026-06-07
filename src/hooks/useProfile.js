import { useLocalStorage } from './useLocalStorage';

export const PROFILE_KEY = 'fitai_profile';

const defaultProfile = {
  name: '',
  age: '',
  weight: '',
  height: '',
  gender: '',
  goal: '',
  secondaryGoal: '',
  trainingDaysPerWeek: '4',
  sessionDuration: '60',
  fitnessLevel: '',
  equipment: [],
  preferredWorkoutTypes: [],
  exercisesToAvoid: '',
  dietaryStyle: '',
  allergies: [],
  foodsLiked: '',
  foodsDisliked: '',
  mealsPerDay: '3',
  dietaryRestrictions: '',
  photoBase64: null,
  profileComplete: false,
  updatedAt: null,
};

export function useProfile() {
  const [profile, setProfile] = useLocalStorage(PROFILE_KEY, defaultProfile);

  const saveProfile = (data) => {
    const updated = {
      ...profile,
      ...data,
      profileComplete: true,
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);
    return updated;
  };

  const clearProfile = () => setProfile(defaultProfile);

  const isProfileComplete = Boolean(
    profile?.name && profile?.age && profile?.goal && profile?.fitnessLevel
  );

  return { profile, saveProfile, clearProfile, isProfileComplete };
}
