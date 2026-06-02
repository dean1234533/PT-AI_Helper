import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

const FREE_PLAN_LIMIT = 3; // plans per month on free tier

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = !!user && user.email === adminEmail;

  useEffect(() => {
    if (!user) { setSub(null); setLoading(false); return; }

    const ref = doc(db, 'users', user.uid);

    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        // First login — create user document
        const data = {
          email: user.email,
          displayName: user.displayName,
          plan: 'free',
          plansThisMonth: 0,
          planMonth: currentMonth(),
          createdAt: serverTimestamp(),
        };
        await setDoc(ref, data);
        setSub(data);
      } else {
        const data = snap.data();
        // Reset monthly counter if it's a new month
        if (data.planMonth !== currentMonth()) {
          const reset = { plansThisMonth: 0, planMonth: currentMonth() };
          await updateDoc(ref, reset);
          setSub({ ...data, ...reset });
        } else {
          setSub(data);
        }
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const isPro = isAdmin || sub?.plan === 'pro' || sub?.plan === 'admin';
  const plansThisMonth = sub?.plansThisMonth || 0;
  const plansRemaining = isPro ? Infinity : Math.max(0, FREE_PLAN_LIMIT - plansThisMonth);
  const canCreate = isPro || plansThisMonth < FREE_PLAN_LIMIT;

  const incrementUsage = async () => {
    if (!user || isPro) return;
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, { plansThisMonth: (sub?.plansThisMonth || 0) + 1 });
  };

  const activatePro = async (stripeCustomerId, stripeSubscriptionId) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      plan: 'pro',
      stripeCustomerId,
      stripeSubscriptionId,
      upgradedAt: serverTimestamp(),
    });
  };

  return (
    <SubscriptionContext.Provider value={{
      sub, loading, isPro, isAdmin,
      plansThisMonth, plansRemaining, canCreate,
      incrementUsage, activatePro,
      FREE_PLAN_LIMIT,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
