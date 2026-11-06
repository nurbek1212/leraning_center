import { ReactNode } from 'react';

interface Props {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export default function FormField({ label, error, hint, children }: Props) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
