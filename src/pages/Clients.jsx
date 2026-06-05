import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, UserPlus, Mail, Phone } from 'lucide-react';
import Layout, { PageHeader } from '../components/Layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useClients } from '../hooks/useClients';
import toast from 'react-hot-toast';

function AddClientModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    setLoading(true);
    try {
      await onAdd(form);
      toast.success(`${form.name} added as a client`);
      setForm({ name: '', email: '', phone: '', notes: '' });
      onClose();
    } catch {
      toast.error('Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Client">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" value={form.name} onChange={update('name')} placeholder="Jane Smith" required />
        <Input label="Email address" type="email" value={form.email} onChange={update('email')} placeholder="jane@example.com" required />
        <Input label="Phone number" type="tel" value={form.phone} onChange={update('phone')} placeholder="+44 7700 900000" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={update('notes')}
            placeholder="Any initial notes about this client..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add Client</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const { clients, loading, addClient } = useClients();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-8">
        <PageHeader
          title="Clients"
          subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''} total`}
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> Add Client
            </Button>
          }
        />

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20">
            <UserPlus className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? 'No clients match your search' : 'No clients yet'}
            </p>
            {!search && (
              <Button onClick={() => setShowModal(true)} size="sm" className="mt-4">
                Add your first client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {initials(client.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{client.name}</p>
                  <div className="flex items-center gap-4 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="w-3 h-3" /> {client.email}
                    </span>
                    {client.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); navigate('/plans/new', { state: { clientId: client.id, clientName: client.name, clientEmail: client.email } }); }}
                >
                  New Plan
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddClientModal open={showModal} onClose={() => setShowModal(false)} onAdd={addClient} />
    </Layout>
  );
}
