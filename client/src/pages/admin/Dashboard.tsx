import type { ReactNode } from 'react';
import { BookOpen, GraduationCap, Users, UsersRound, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Badge, { scoreTone } from '../../components/Badge';
import DataTable from '../../components/DataTable';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import StatCard from '../../components/StatCard';
import { useFetch } from '../../hooks/useFetch';
import type { DashboardStats } from '../../types';
import ProgressBar from '../../components/ProgressBar';
import { formatDate, formatMoney, fmtScore, percentOf, periodLabel } from '../../utils/format';

function ChartCard({ title, children, empty }: { title: string; children: ReactNode; empty: boolean }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 font-semibold text-slate-900">{title}</h3>
      {empty ? (
        <p className="py-16 text-center text-sm text-slate-400">Ma'lumot yo'q</p>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error } = useFetch<DashboardStats>('/dashboard');

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || "Statistika yuklanmadi"} />;

  const { counts } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami talabalar" value={counts.students} icon={<Users size={22} />} />
        <StatCard label="Ustozlar" value={counts.teachers} icon={<GraduationCap size={22} />} tone="green" />
        <StatCard label="Guruhlar" value={counts.groups} icon={<UsersRound size={22} />} tone="amber" />
        <StatCard label="Fanlar" value={counts.subjects} icon={<BookOpen size={22} />} tone="rose" />
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{periodLabel(data.payments.period)} — to'lovlar</h3>
              <p className="text-sm text-slate-500">
                {formatMoney(data.payments.paid)} / {formatMoney(data.payments.expected)}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Qarz: <b className="tabular text-rose-600">{formatMoney(data.payments.debt)}</b>
          </p>
        </div>
        <ProgressBar className="mt-4" value={data.payments.paid} max={data.payments.expected} />
        <p className="mt-1.5 text-xs text-slate-400">{Math.round(percentOf(data.payments.paid, data.payments.expected))}% yig'ildi</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Fanlar bo'yicha talabalar soni" empty={data.studentsBySubject.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.studentsBySubject}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [String(v), 'Talabalar']} />
              <Bar dataKey="students" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Guruhlar bo'yicha o'rtacha ball" empty={data.averageByGroup.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.averageByGroup}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [String(v), "O'rtacha ball"]} />
              <Bar dataKey="average" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card overflow-hidden">
        <h3 className="px-5 pt-5 font-semibold text-slate-900">Oxirgi qo'yilgan baholar</h3>
        <div className="mt-3">
          <DataTable
            rows={data.latestGrades}
            rowKey={(g) => g.id}
            emptyText="Hali baho qo'yilmagan"
            columns={[
              { header: 'Talaba', cell: (g) => <span className="font-medium text-slate-900">{g.student_name}</span> },
              { header: 'Guruh', cell: (g) => g.group_name },
              { header: 'Ustoz', cell: (g) => g.teacher_name },
              { header: 'Mezon', cell: (g) => g.component_name },
              {
                header: 'Ball',
                cell: (g) => (
                  <Badge tone={scoreTone(percentOf(g.score, g.max_score))}>
                    {fmtScore(g.score)} / {g.max_score}
                  </Badge>
                ),
              },
              { header: 'Sana', cell: (g) => formatDate(g.date) },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
