import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

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
  trainerId: null,
  trainerName: null,
  trainerEmail: null,
  lastCheckInAt: null,
  brandName: null,
  brandColor: null,
  brandLogoBase64: null,
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(defaultProfile); setLoading(false); return; }
    const ref = doc(db, 'users', user.uid, 'data', 'profile');
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? { ...defaultProfile, ...snap.data() } : defaultProfile);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const saveProfile = async (data) => {
    if (!user) return;
    const updated = { ...profile, ...data, profileComplete: true, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), updated);
    return updated;
  };

  const clearProfile = async () => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), defaultProfile);
  };

  const isProfileComplete = Boolean(profile?.name && profile?.age && profile?.goal && profile?.fitnessLevel);

  return { profile, saveProfile, clearProfile, isProfileComplete, loading };
}
