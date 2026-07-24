import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import ProgressSparkline from '../components/ProgressSparkline';
import {
  Users, Plus, CheckCircle, Clock,
  Trash2, ChevronDown, ChevronUp,
  Loader2, Calendar, X, Send, Copy, Weight, Zap, Smile
} from 'lucide-react';
import {
  getFirestore, collection, addDoc, getDocs, onSnapshot,
  deleteDoc, doc, query, where, orderBy, limit
} from 'firebase/firestore';
import app from '../firebase/config';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

const db = getFirestore(app);

function generateInviteToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

function InviteClientModal({ onClose, onInvite }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try { await onInvite(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-slate-100 text-lg">Invite a Client</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          They'll get an email with a link to create their own account, fill out their profile,
          and start weekly check-ins you can follow right here.
        </p>

        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', placeholder: 'Jane Smith' },
            { label: 'Email Address', key: 'email', placeholder: 'jane@example.com', type: 'email' },
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
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-slate-100 text-sm outline-none transition-all"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveClientDetails({ clientUid }) {
  const [profile, setProfile] = useState(null);
  const [checkIns, setCheckIns] = useState([]);

  useEffect(() => {
    const unsubProfile = onSnapshot(doc(db, 'users', clientUid, 'data', 'profile'), (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
    });
    const q = query(collection(db, 'users', clientUid, 'checkins'), orderBy('date', 'desc'), limit(12));
    const unsubCheckIns = onSnapshot(q, (snap) => {
      setCheckIns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProfile(); unsubCheckIns(); };
  }, [clientUid]);

  const latest = checkIns[0] || null;
  const weights = [...checkIns].reverse().map((c) => Number(c.weight)).filter((w) => !Number.isNaN(w));
  const startWeight = weights[0];
  const currentWeight = weights[weights.length - 1];
  const delta = startWeight != null && currentWeight != null ? currentWeight - startWeight : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Weight Trend</p>
        {weights.length >= 2 ? (
          <>
            <ProgressSparkline values={weights} />
            <p className="text-xs text-slate-300 flex items-center gap-1.5">
              <Weight className="w-3.5 h-3.5 text-brand-400" />
              {currentWeight} kg
              {delta != null && (
                <span className={delta <= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                  ({delta > 0 ? '+' : ''}{delta.toFixed(1)} kg)
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">No check-ins yet</p>
        )}
      </div>

      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Latest Check-in</p>
        {latest ? (
          <div className="space-y-1.5 text-xs text-slate-300">
            <p className="text-slate-500">{new Date(latest.date).toLocaleDateString()}</p>
            <p className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Energy {latest.energy}/10</p>
            <p className="flex items-center gap-1.5"><Smile className="w-3.5 h-3.5 text-emerald-400" /> Mood {latest.mood}/10</p>
            <p>Workout: <span className="font-semibold capitalize">{latest.adherenceWorkout}</span></p>
            <p>Nutrition: <span className="font-semibold capitalize">{latest.adherenceNutrition}</span></p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Waiting on their first check-in</p>
        )}
      </div>

      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Profile</p>
        <div className="space-y-1.5 text-xs text-slate-300">
          <p>Goal: <span className="font-semibold">{profile?.goal || 'Not set'}</span></p>
          <p>Level: <span className="font-semibold">{profile?.fitnessLevel || 'Not set'}</span></p>
          <p>Days/week: <span className="font-semibold">{profile?.trainingDaysPerWeek || 'Not set'}</span></p>
        </div>
      </div>

      {latest?.notesWell || latest?.notesChallenging ? (
        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {latest.notesWell && (
            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3">
              <p className="text-[10px] text-emerald-400 font-semibold mb-1">What went well</p>
              <p className="text-xs text-slate-300">{latest.notesWell}</p>
            </div>
          )}
          {latest.notesChallenging && (
            <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3">
              <p className="text-[10px] text-amber-400 font-semibold mb-1">Challenges</p>
              <p className="text-xs text-slate-300">{latest.notesChallenging}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ClientCard({ client, onDelete, onCopyLink }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = client.status === 'active' && client.clientUid;

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-400 font-black text-sm">{client.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-100 text-sm truncate">{client.name}</p>
            <p className="text-xs text-slate-500 truncate">{client.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isActive ? (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-3 h-3" />Active
            </span>
          ) : (
            <button
              onClick={() => onCopyLink(client)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 hover:text-amber-300 text-xs font-semibold rounded-xl transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Invite Link
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onDelete(client.id)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-800/60 p-5">
          {isActive ? (
            <ActiveClientDetails clientUid={client.clientUid} />
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-amber-400" />
              Invited {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-GB') : ''} — waiting for them to sign up.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'clients'), where('trainerId', '==', user.uid)),
      (snap) => {
        setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { toast.error('Failed to load clients'); console.error(err); setLoading(false); }
    );
    return unsub;
  }, [user]);

  const handleInviteClient = async (form) => {
    const inviteToken = generateInviteToken();
    const trainerName = user.displayName || 'Your Trainer';
    await addDoc(collection(db, 'clients'), {
      name: form.name,
      email: form.email,
      trainerId: user.uid,
      trainerName,
      trainerEmail: user.email,
      status: 'invited',
      inviteToken,
      createdAt: new Date().toISOString(),
    });

    const inviteUrl = `${window.location.origin}/#/register?invite=${inviteToken}`;
    try {
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientEmail: form.email, clientName: form.name, trainerName, inviteUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Invite sent to ${form.name}!`);
    } catch (err) {
      toast.error(`Invite created, but email failed to send. Copy the link instead. (${err.message})`);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm('Remove this client?')) return;
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      toast.success('Client removed');
    } catch { toast.error('Failed to remove client'); }
  };

  const handleCopyLink = async (client) => {
    const inviteUrl = `${window.location.origin}/#/register?invite=${client.inviteToken}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success(`Invite link copied for ${client.name}`);
  };

  const stats = {
    total: clients.length,
    invited: clients.filter(c => c.status !== 'active').length,
    active: clients.filter(c => c.status === 'active').length,
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-950 text-white pb-20">
      <SEO title="Clients" noIndex />
        <div className="max-w-5xl mx-auto px-4 pt-10 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Client Management
              </h1>
              <p className="text-slate-400 text-xs mt-1">Invite clients and monitor their real progress</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Invite Client
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Clients', value: stats.total, Icon: Users, color: 'text-brand-400', bg: 'bg-brand-600/10 border-brand-500/20' },
              { label: 'Awaiting Signup', value: stats.invited, Icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Active', value: stats.active, Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
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
          <div className="bg-brand-950/30 border border-brand-900/40 rounded-2xl p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand-300">Automated Weekly Check-ins</p>
              <p className="text-xs text-slate-400 mt-1">
                Once a client signs up through your invite link, they get a reminder email roughly once a
                week if they haven't checked in recently. Their weight, energy, mood, and adherence show up
                here automatically.
              </p>
            </div>
          </div>

          {/* Client list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Users className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-slate-400 text-sm">No clients yet. Invite your first client to get started.</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Invite First Client
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onDelete={handleDeleteClient}
                  onCopyLink={handleCopyLink}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <InviteClientModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteClient}
        />
      )}
    </Layout>
  );
}
