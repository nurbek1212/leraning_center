import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, ClipboardList, Users } from 'lucide-react';
import Badge from '../../components/Badge';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import Tabs from '../../components/Tabs';
import { useFetch } from '../../hooks/useFetch';
import type { GroupDetail } from '../../types';
import GroupAttendanceTab from './GroupAttendanceTab';
import GroupGradesTab from './GroupGradesTab';
import GroupStudentsTab from './GroupStudentsTab';

type Tab = 'students' | 'grades' | 'attendance';

export default function GroupPage() {
  const { id } = useParams();
  const groupId = Number(id);
  const { data, loading, error, reload } = useFetch<GroupDetail>(
    Number.isInteger(groupId) && groupId > 0 ? `/groups/${groupId}/students` : null
  );
  const [tab, setTab] = useState<Tab>('students');

  const back = (
    <Link to="/teacher" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
      <ArrowLeft size={16} /> Guruhlarga qaytish
    </Link>
  );

  if (loading && !data) return <Spinner />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorBox message={error || 'Guruh topilmadi'} />
      </div>
    );
  }

  const { group, students } = data;
  const scheme = group.scheme;
  const published = scheme?.status === 'published';

  return (
    <div className="space-y-5">
      {back}

      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{group.name}</h2>
          <p className="text-sm text-brand-600">{group.subject_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>
            {group.schedule || 'Jadval belgilanmagan'} · {students.length} ta talaba
          </span>
          {!scheme ? (
            <Badge tone="gray">Baholash mezoni yo'q</Badge>
          ) : published ? (
            <Badge tone="green" dot>Mezon e'lon qilingan</Badge>
          ) : (
            <Badge tone="amber" dot>Mezon qoralama</Badge>
          )}
        </div>
      </div>

      {!published && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {scheme
            ? "Baholash mezoni hali e'lon qilinmagan. Administrator e'lon qilgandan keyin baho qo'ya olasiz."
            : "Bu fan uchun baholash mezoni yaratilmagan. Administrator mezon tuzib e'lon qilgandan keyin baho qo'ya olasiz."}
        </div>
      )}

      <Tabs
        tabs={[
          { key: 'students', label: 'Talabalar', icon: <Users size={16} /> },
          { key: 'grades', label: 'Baholar', icon: <ClipboardList size={16} /> },
          { key: 'attendance', label: 'Davomat', icon: <CalendarCheck size={16} /> },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'students' && <GroupStudentsTab groupId={groupId} students={students} maxTotal={scheme?.max_total ?? null} />}
      {tab === 'grades' && <GroupGradesTab groupId={groupId} published={published} onChanged={reload} />}
      {tab === 'attendance' && <GroupAttendanceTab groupId={groupId} students={students} />}
    </div>
  );
}
