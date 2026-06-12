import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, writeBatch, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function useChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setMessages([]); setLoading(false); return; }
    const col = collection(db, 'users', user.uid, 'chat');
    const q = query(col, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addMessage = async (role, content) => {
    if (!user) return;
    const expiresAt = Timestamp.fromMillis(Date.now() + NINETY_DAYS_MS);
    const msg = { role, content, timestamp: new Date().toISOString(), expiresAt };
    const ref = await addDoc(collection(db, 'users', user.uid, 'chat'), msg);
    return { id: ref.id, ...msg };
  };

  const clearHistory = async () => {
    if (!user) return;
    const col = collection(db, 'users', user.uid, 'chat');
    const snap = await getDocs(col);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  };

  return { messages, addMessage, clearHistory, loading };
}
