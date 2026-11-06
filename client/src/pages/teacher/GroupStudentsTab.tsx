import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Avatar from '../../components/Avatar';
import Badge, { scoreTone } from '../../components/Badge';
import ClientTable from '../../components/ClientTable';
import type { GroupStudent } from '../../types';
import { fmtScore, percentOf } from '../../utils/format';

interface Props {
  groupId: number;
  students: GroupStudent[];
  maxTotal: number | null; // e'lon qilingan mezonning umumiy balli (odatda 100)
}

// Talaba qatori bosilganda uning sahifasi ochiladi — baho shu yerdan qo'yiladi
export default function GroupStudentsTab({ groupId, students, maxTotal }: Props) {
  return (
    <ClientTable
      rows={students}
      rowKey={(s) => s.id}
      searchText={(s) => `${s.full_name} ${s.email} ${s.phone || ''}`}
      searchPlaceholder="Talaba qidirish..."
      emptyText="Guruhda talabalar yo'q"
      columns={[
        {
          header: 'Talaba',
          cell: (s) => (
            <Link to={`/teacher/groups/${groupId}/students/${s.id}`} className="flex items-center gap-3">
              <Avatar name={s.full_name} size={34} />
              <span>
                <span className="block font-medium text-slate-900 hover:text-brand-600">{s.full_name}</span>
                <span className="block text-xs text-slate-400">{s.phone || s.email}</span>
              </span>
            </Link>
          ),
        },
        { header: 'Baholar', cell: (s) => <span className="tabular">{s.grades_count}</span> },
        {
          header: 'Jami ball',
          cell: (s) =>
            s.total == null || !maxTotal ? (
              '—'
            ) : (
              <Badge tone={scoreTone(percentOf(s.total, maxTotal))}>
                {fmtScore(s.total)} / {maxTotal}
              </Badge>
            ),
        },
        {
          header: 'Davomat',
          cell: (s) => (s.attendance_percent == null ? '—' : <span className="tabular">{s.attendance_percent}%</span>),
        },
        {
          header: '',
          className: 'text-right',
          cell: (s) => (
            <Link to={`/teacher/groups/${groupId}/students/${s.id}`} className="btn-secondary !px-3 !py-1.5 !text-xs">
              Ochish <ChevronRight size={14} />
            </Link>
          ),
        },
      ]}
    />
  );
}
