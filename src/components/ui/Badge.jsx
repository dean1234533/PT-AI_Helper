const variants = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-brand-100 text-brand-700',
  sent: 'bg-green-100 text-green-700',
  default: 'bg-gray-100 text-gray-600',
};

const labels = {
  draft: 'Draft',
  review: 'In Review',
  approved: 'Approved',
  sent: 'Sent to Client',
};

export default function Badge({ status, children, className = '' }) {
  const variant = variants[status] || variants.default;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variant} ${className}`}>
      {children || labels[status] || status}
    </span>
  );
}
