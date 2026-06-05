import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export function usePlans(clientId = null) {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const constraints = [where('trainerId', '==', user.uid), orderBy('createdAt', 'desc')];
    if (clientId) constraints.splice(1, 0, where('clientId', '==', clientId));
    const q = query(collection(db, 'plans'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('usePlans snapshot error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user, clientId]);

  const savePlan = async (data) => {
    return addDoc(collection(db, 'plans'), {
      ...data,
      trainerId: user.uid,
      status: 'draft',
      createdAt: serverTimestamp(),
    });
  };

  const updatePlan = async (planId, data) => {
    return updateDoc(doc(db, 'plans', planId), { ...data, updatedAt: serverTimestamp() });
  };

  const getPlan = async (planId) => {
    const snap = await getDoc(doc(db, 'plans', planId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  };

  return { plans, loading, savePlan, updatePlan, getPlan };
}
