import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, writeBatch, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function useCheckIns() {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setCheckIns([]); setLoading(false); return; }
    const col = collection(db, 'users', user.uid, 'checkins');
    const q = query(col, orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setCheckIns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const saveCheckIn = async (data) => {
    if (!user) return;
    const expiresAt = Timestamp.fromMillis(Date.now() + NINETY_DAYS_MS);
    const newCheckIn = {
      date: new Date().toISOString(),
      weekNumber: checkIns.length + 1,
      expiresAt,
      ...data,
    };
    const ref = await addDoc(collection(db, 'users', user.uid, 'checkins'), newCheckIn);
    return { id: ref.id, ...newCheckIn };
  };

  const clearCheckIns = async () => {
    if (!user) return;
    const col = collection(db, 'users', user.uid, 'checkins');
    const snap = await getDocs(col);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  };

  return {
    checkIns,
    latestCheckIn: checkIns[0] || null,
    previousCheckIn: checkIns[1] || null,
    saveCheckIn,
    clearCheckIns,
    loading,
  };
}
