export default function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-[#fffdf9] rounded-2xl border border-[#ded9d1] shadow-[0_14px_35px_rgba(53,45,35,.055)] ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}
