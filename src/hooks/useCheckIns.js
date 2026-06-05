import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export function useCheckIns(clientId = null) {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const constraints = [
      where('trainerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    ];
    if (clientId) constraints.splice(1, 0, where('clientId', '==', clientId));
    const q = query(collection(db, 'checkIns'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCheckIns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useCheckIns snapshot error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user, clientId]);

  const createCheckIn = async (data) =>
    addDoc(collection(db, 'checkIns'), {
      ...data,
      trainerId: user.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

  const updateCheckIn = async (id, data) =>
    updateDoc(doc(db, 'checkIns', id), { ...data });

  return { checkIns, loading, createCheckIn, updateCheckIn };
}

export function useCheckInSchedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'checkInSchedules'),
      where('trainerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useCheckInSchedules snapshot error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  const createSchedule = async (data) =>
    addDoc(collection(db, 'checkInSchedules'), {
      ...data,
      trainerId: user.uid,
      active: true,
      lastCheckInDate: null,
      createdAt: serverTimestamp(),
    });

  const updateSchedule = async (id, data) =>
    updateDoc(doc(db, 'checkInSchedules', id), data);

  return { schedules, loading, createSchedule, updateSchedule };
}
