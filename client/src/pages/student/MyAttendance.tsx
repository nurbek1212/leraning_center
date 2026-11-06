import { useState } from 'react';
import Badge from '../../components/Badge';
import ClientTable from '../../components/ClientTable';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import StatCard from '../../components/StatCard';
import { useFetch } from '../../hooks/useFetch';
import type { MyAttendance as MyAttendanceData } from '../../types';
import { attendanceLabels, formatDate } from '../../utils/format';
import { CalendarCheck, CalendarX, Percent, CalendarDays } from 'lucide-react';

export default function MyAttendance() {
  const { data, loading, error } = useFetch<MyAttendanceData>('/students/me/attendance');
  const [groupFilter, setGroupFilter] = useState('');

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || 'Davomat yuklanmadi'} />;

  const { summary } = data;
  const groups = Array.from(new Map(data.records.map((r) => [r.group_id, r.group_name])).entries());
  const rows = groupFilter ? data.records.filter((r) => String(r.group_id) === groupFilter) : data.records;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami darslar" value={summary.total} icon={<CalendarDays size={22} />} />
        <StatCard
          label="Qatnashgan"
          value={summary.present}
          icon={<CalendarCheck size={22} />}
          tone="green"
        />
        <StatCard
          label="Qatnashmagan"
          value={summary.absent}
          icon={<CalendarX size={22} />}
          tone="rose"
        />
        <StatCard
          label="Davomat foizi"
          value={`${summary.percent}%`}
          icon={<Percent size={22} />}
          tone="amber"
        />
      </div>

      <ClientTable
        rows={rows}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.subject_name} ${r.group_name} ${formatDate(r.date)} ${attendanceLabels[r.status]}`}
        searchPlaceholder="Fan, guruh yoki sana..."
        emptyText="Davomat hali belgilanmagan"
        toolbar={
          <select className="input sm:max-w-48" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">Barcha guruhlar</option>
            {groups.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        }
        columns={[
          { header: 'Sana', cell: (r) => <span className="font-medium text-slate-900">{formatDate(r.date)}</span> },
          { header: 'Fan', cell: (r) => r.subject_name },
          { header: 'Guruh', cell: (r) => r.group_name },
          {
            header: 'Holat',
            cell: (r) => (
              <Badge tone={r.status === 'present' ? 'green' : 'red'}>{attendanceLabels[r.status]}</Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
