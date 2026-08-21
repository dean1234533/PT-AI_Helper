export default function Input({
  label,
  error,
  hint,
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-semibold text-[#494642]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-xl border text-sm text-[#181719] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all ${
          error ? 'border-red-400 bg-red-50' : 'border-[#d7d1c8] bg-white hover:border-[#aaa39a]'
        }`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', required = false, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-semibold text-[#494642]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`w-full px-4 py-3 rounded-xl border text-sm text-[#181719] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all ${
          error ? 'border-red-400 bg-red-50' : 'border-[#d7d1c8] bg-white hover:border-[#aaa39a]'
        }`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className = '', required = false, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-semibold text-[#494642]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-3 rounded-xl border text-sm text-[#181719] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all resize-y ${
          error ? 'border-red-400 bg-red-50' : 'border-[#d7d1c8] bg-white hover:border-[#aaa39a]'
        }`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
