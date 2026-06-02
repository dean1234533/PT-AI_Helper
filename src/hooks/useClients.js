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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'clients'),
      where('trainerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addClient = async (data) => {
    return addDoc(collection(db, 'clients'), {
      ...data,
      trainerId: user.uid,
      createdAt: serverTimestamp(),
    });
  };

  const updateClient = async (clientId, data) => {
    return updateDoc(doc(db, 'clients', clientId), data);
  };

  return { clients, loading, addClient, updateClient };
}
