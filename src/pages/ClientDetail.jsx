import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import Layout, { Breadcrumb } from '../components/Layout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useClients } from '../hooks/useClients';
import { usePlans } from '../hooks/usePlans';

function timeAgo(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { clients, loading: cLoading } = useClients();
  const { plans, loading: pLoading } = usePlans(clientId);

  const client = clients.find((c) => c.id === clientId);

  if (cLoading || pLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!client) return <Layout><div className="p-8 text-gray-500">Client not found.</div></Layout>;

  return (
    <Layout>
      <div className="p-4 sm:p-8">
        <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: client.name }]} />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold shrink-0">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-gray-500 text-sm sm:text-base truncate">{client.email}{client.phone ? ` · ${client.phone}` : ''}</p>
            </div>
          </div>
          <Button className="shrink-0 self-start" onClick={() => navigate('/plans/new', { state: { clientId: client.id, clientName: client.name, clientEmail: client.email } })}>
            <Plus className="w-4 h-4" /> New Plan
          </Button>
        </div>

        {client.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-800">
            <span className="font-semibold">Notes: </span>{client.notes}
          </div>
        )}

        <h2 className="text-lg font-semibold text-gray-900 mb-4">Plans ({plans.length})</h2>

        {plans.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16">
            <p className="text-gray-500 mb-3">No plans yet for {client.name}</p>
            <Button size="sm" onClick={() => navigate('/plans/new', { state: { clientId: client.id, clientName: client.name, clientEmail: client.email } })}>
              Create First Plan
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                    <th className="px-4 sm:px-6 py-3 font-medium">Goal</th>
                    <th className="px-4 sm:px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium hidden sm:table-cell">Created</th>
                    <th className="px-4 sm:px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(plan.status === 'draft' ? `/plans/${plan.id}/review` : `/plans/${plan.id}`)}>
                      <td className="px-4 sm:px-6 py-4 font-medium text-gray-800">{plan.questionnaire?.primaryGoal || '—'}</td>
                      <td className="px-4 sm:px-6 py-4"><Badge status={plan.status} /></td>
                      <td className="px-6 py-4 text-gray-400 hidden sm:table-cell">{timeAgo(plan.createdAt)}</td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <span className="text-brand-600 font-medium">{plan.status === 'draft' ? 'Review' : 'View'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
