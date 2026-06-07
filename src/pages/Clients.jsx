import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import {
  Users, Plus, Send, CheckCircle, Clock, XCircle,
  Trash2, ChevronDown, ChevronUp,
  Loader2, Sparkles, Calendar, X, Save
} from 'lucide-react';
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, query, where, orderBy
} from 'firebase/firestore';
import app from '../firebase/config';
import toast from 'react-hot-toast';

const db = getFirestore(app);

const STATUS_CONFIG = {
  sent:     { label: 'Awaiting Response', color: 'text-amber-400',   bg: 'bg-amber-500/10  border-amber-500/20',   Icon: Clock },
  answered: { label: 'Responded',         color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', Icon: CheckCircle },
  none:     { label: 'Not Sent Yet',      color: 'text-slate-400',   bg: 'bg-slate-500/10   border-slate-500/20',   Icon: XCircle },
};

function AddClientModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', email: '', goal: '',
    fitnessLevel: 'Beginner', workoutDays: 3, autoCheckIn: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-slate-100 text-lg">Add New Client</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Full Name',     key: 'name',  placeholder: 'Jane Smith' },
            { label: 'Email Address', key: 'email', placeholder: 'jane@example.com', type: 'email' },
            { label: 'Goal',          key: 'goal',  placeholder: 'e.g. Lose 10kg, Build muscle...' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {label}
              </label>
              <input
                type={type || 'text'}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 text-sm outline-none transition-all"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Fitness Level
              </label>
              <select
                value={form.fitnessLevel}
                onChange={e => setForm(f => ({ ...f, fitnessLevel: e.target.value }))}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2.5 text-slate-100 text-sm outline-none"
              >
                {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Workout Days/Week
              </label>
              <select
                value={form.workoutDays}
                onChange={e => setForm(f => ({ ...f, workoutDays: Number(e.target.value) }))}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2.5 text-slate-100 text-sm outline-none"
              >
                {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} days</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, autoCheckIn: !f.autoCheckIn }))}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.autoCheckIn ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoCheckIn ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-300">Send automatic weekly check-ins every Monday</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientCard({ client, checkIns, onDelete, onSendCheckIn }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending]   = useState(false);

  const latestCheckIn = checkIns.find(c => c.clientEmail === client.email);
  const status = latestCheckIn?.status || 'none';
  const { label, color, bg, Icon } = STATUS_CONFIG[status] || STATUS_CONFIG.none;

  const handleSend = async () => {
    setSending(true);
    try { await onSendCheckIn(client); }
    finally { setSending(false); }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 font-black text-sm">{client.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-100 text-sm truncate">{client.name}</p>
            <p className="text-xs text-slate-500 truncate">{client.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${bg} ${color}`}>
            <Icon className="w-3 h-3" />{label}
          </span>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/25 text-blue-400 hover:text-blue-300 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Sending...' : 'Send Check-in'}
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onDelete(client.id)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-800/60 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Goal',          value: client.goal || 'Not set' },
              { label: 'Fitness Level', value: client.fitnessLevel || 'Not set' },
              { label: 'Workout Days',  value: client.workoutDays ? `${client.workoutDays}x/week` : 'Not set' },
              { label: 'Auto Check-in', value: client.autoCheckIn !== false ? '✅ Every Monday' : '❌ Off' },
              { label: 'Added',         value: client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-GB') : 'Unknown' },
              { label: 'Last Check-in', value: latestCheckIn?.sentAt ? new Date(latestCheckIn.sentAt).toLocaleDateString('en-GB') : 'Never' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-xs text-slate-200 font-semibold mt-1">{value}</p>
              </div>
            ))}
          </div>

          {latestCheckIn?.status === 'answered' && latestCheckIn.answers?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Latest Check-in Responses</p>
              {latestCheckIn.answers.slice(0, 3).map((a, i) => (
                <div key={i} className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-400 font-semibold mb-1">{a.question}</p>
                  <p className="text-xs text-slate-300">{a.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Clients() {
  const { user }                        = useAuth();
  const navigate                        = useNavigate();
  const [clients, setClients]           = useState([]);
  const [checkIns, setCheckIns]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sendingAll, setSendingAll]     = useState(false);

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientSnap, checkInSnap] = await Promise.all([
        getDocs(query(collection(db, 'clients'), where('trainerId', '==', user.uid))),
        getDocs(query(collection(db, 'checkIns'), where('trainerId', '==', user.uid), orderBy('sentAt', 'desc'))),
      ]);
      setClients(clientSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCheckIns(checkInSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Failed to load clients');
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleAddClient = async (form) => {
    const docRef = await addDoc(collection(db, 'clients'), {
      ...form,
      trainerId:    user.uid,
      trainerName:  user.displayName || 'Your Trainer',
      trainerEmail: user.email,
      createdAt:    new Date().toISOString(),
    });
    setClients(c => [...c, {
      id: docRef.id, ...form,
      trainerId: user.uid, trainerName: user.displayName,
      trainerEmail: user.email, createdAt: new Date().toISOString(),
    }]);
    toast.success(`${form.name} added!`);
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm('Remove this client?')) return;
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      setClients(c => c.filter(cl => cl.id !== clientId));
      toast.success('Client removed');
    } catch { toast.error('Failed to remove client'); }
  };

  const handleSendCheckIn = async (client) => {
    try {
      const res = await fetch('/api/ScheduledCheckins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:     client.id,
          clientName:   client.name,
          clientEmail:  client.email,
          trainerId:    user.uid,
          trainerName:  user.displayName || 'Your Trainer',
          trainerEmail: user.email,
          planSummary: {
            goal:         client.goal,
            fitnessLevel: client.fitnessLevel,
            workoutDays:  client.workoutDays,
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Check-in sent to ${client.name}!`);
      loadData();
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    }
  };

  const handleSendAll = async () => {
    if (!confirm(`Send check-ins to all ${clients.length} clients now?`)) return;
    setSendingAll(true);
    let sent = 0;
    for (const client of clients) {
      if (client.autoCheckIn === false) continue;
      try { await handleSendCheckIn(client); sent++; } catch { /* continue */ }
    }
    setSendingAll(false);
    toast.success(`Sent check-ins to ${sent} clients`);
  };

  const stats = {
    total:            clients.length,
    autoEnabled:      clients.filter(c => c.autoCheckIn !== false).length,
    awaitingResponse: checkIns.filter(c => c.status === 'sent').length,
    responded:        checkIns.filter(c => c.status === 'answered').length,
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-950 text-white pb-20">
        <div className="max-w-5xl mx-auto px-4 pt-10 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Client Management
              </h1>
              <p className="text-slate-400 text-xs mt-1">Manage clients and automated weekly check-ins</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSendAll}
                disabled={sendingAll || !clients.length}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {sendingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Send All Check-ins
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Client
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Clients',     value: stats.total,            Icon: Users,       color: 'text-blue-400',    bg: 'bg-blue-600/10 border-blue-500/20' },
              { label: 'Auto Check-in On',  value: stats.autoEnabled,      Icon: Calendar,    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Awaiting Response', value: stats.awaitingResponse, Icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Responded',         value: stats.responded,        Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            ].map(({ label, value, Icon, color, bg }) => (
              <div key={label} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
                  <p className="text-2xl font-black text-slate-100 mt-1">{value}</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Info banner */}
          <div className="bg-blue-950/30 border border-blue-900/40 rounded-2xl p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-300">Automated Weekly Check-ins</p>
              <p className="text-xs text-slate-400 mt-1">
                Every Monday at 8:00 AM, AI-personalised check-in emails are automatically sent to all clients
                with auto check-in enabled. You receive an email when each client responds. You can also
                trigger check-ins manually anytime using the button on each client card.
              </p>
            </div>
          </div>

          {/* Client list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Users className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-slate-400 text-sm">No clients yet. Add your first client to get started.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Add First Client
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  checkIns={checkIns}
                  onDelete={handleDeleteClient}
                  onSendCheckIn={handleSendCheckIn}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddClient}
        />
      )}
    </Layout>
  );
}