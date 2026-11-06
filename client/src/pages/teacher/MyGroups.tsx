import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight, Users } from 'lucide-react';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import { useFetch } from '../../hooks/useFetch';
import type { Group } from '../../types';

export default function MyGroups() {
  const { data, loading, error } = useFetch<Group[]>('/groups/my');

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  if (!data || data.length === 0) {
    return <div className="card p-10 text-center text-sm text-slate-400">Sizga hali guruh biriktirilmagan</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((g) => (
        <Link
          key={g.id}
          to={`/teacher/groups/${g.id}`}
          className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-pop"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{g.name}</h3>
              <p className="text-sm text-brand-600">{g.subject_name}</p>
            </div>
            <ChevronRight size={20} className="text-slate-300 transition group-hover:text-brand-500" />
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-500">
            <p className="flex items-center gap-2">
              <Users size={16} /> {g.student_count} ta talaba
            </p>
            <p className="flex items-center gap-2">
              <CalendarClock size={16} /> {g.schedule || 'Jadval belgilanmagan'}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
