import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Search } from 'lucide-react';
import Layout, { PageHeader } from '../components/Layout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
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

export default function Plans() {
  const navigate = useNavigate();
  const { plans, loading } = usePlans();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = plans.filter((p) => {
    const matchSearch = !search ||
      p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      p.clientEmail?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
          title="All Plans"
          subtitle={`${plans.length} plans total`}
          action={
            <Button onClick={() => navigate('/plans/new')}>
              <Plus className="w-4 h-4" /> New Plan
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name or email..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'draft', 'approved', 'sent'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20">
            <ClipboardList className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No plans found</p>
            <Button onClick={() => navigate('/plans/new')} size="sm" className="mt-4">
              <Plus className="w-4 h-4" /> Create Plan
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 sm:px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium hidden sm:table-cell">Goal</th>
                    <th className="px-6 py-3 font-medium hidden md:table-cell">Fitness Level</th>
                    <th className="px-4 sm:px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium hidden sm:table-cell">Created</th>
                    <th className="px-4 sm:px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => navigate(plan.status === 'draft' ? `/plans/${plan.id}/review` : `/plans/${plan.id}`)}>
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{plan.clientName}</p>
                          <p className="text-gray-400 text-xs">{plan.clientEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">{plan.questionnaire?.primaryGoal || '—'}</td>
                      <td className="px-6 py-4 text-gray-600 capitalize hidden md:table-cell">{plan.questionnaire?.fitnessLevel || '—'}</td>
                      <td className="px-4 sm:px-6 py-4"><Badge status={plan.status} /></td>
                      <td className="px-6 py-4 text-gray-400 hidden sm:table-cell">{timeAgo(plan.createdAt)}</td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <button className="text-brand-600 hover:text-brand-700 font-medium">
                          {plan.status === 'draft' ? 'Review' : 'View'}
                        </button>
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
