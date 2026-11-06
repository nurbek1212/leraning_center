import type { ReactNode } from 'react';
import { Mail, Phone, Shield } from 'lucide-react';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { useFetch } from '../hooks/useFetch';
import type { Profile as ProfileData } from '../types';
import { formatDate, roleLabels } from '../utils/format';

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { data, loading, error } = useFetch<ProfileData>('/auth/me');

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || "Profil yuklanmadi"} />;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-1">
        <div className="flex flex-col items-center text-center">
          <Avatar name={data.full_name} size={80} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{data.full_name}</h2>
          <div className="mt-2">
            <Badge tone="blue">{roleLabels[data.role]}</Badge>
          </div>
        </div>
        <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
          <InfoRow icon={<Mail size={16} />} label="Email" value={data.email} />
          <InfoRow icon={<Phone size={16} />} label="Telefon" value={data.phone || '—'} />
          <InfoRow icon={<Shield size={16} />} label="Ro'yxatdan o'tgan sana" value={formatDate(data.created_at)} />
        </div>
      </div>

      <div className="space-y-6 lg:col-span-2">
        {data.role === 'teacher' && (
          <div className="card p-6">
            <h3 className="mb-3 font-semibold text-slate-900">O'qitadigan fanlarim</h3>
            {data.subjects.length === 0 ? (
              <p className="text-sm text-slate-400">Fan biriktirilmagan</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.subjects.map((s) => (
                  <Badge key={s.id} tone="blue">
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {data.role !== 'admin' && (
          <div className="card p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Guruhlarim</h3>
            {data.groups.length === 0 ? (
              <p className="text-sm text-slate-400">Guruh biriktirilmagan</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.groups.map((g) => (
                  <div key={g.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{g.name}</p>
                    <p className="text-sm text-slate-500">{g.subject_name}</p>
                    {g.teacher_name && <p className="mt-1 text-xs text-slate-400">Ustoz: {g.teacher_name}</p>}
                    <p className="mt-1 text-xs text-slate-400">{g.schedule || 'Jadval belgilanmagan'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {data.role === 'admin' && (
          <div className="card p-6 text-sm text-slate-500">
            Siz tizim administratorisiz: fanlar, ustozlar, talabalar va guruhlarni chap menyu orqali boshqarasiz.
          </div>
        )}
      </div>
    </div>
  );
}
