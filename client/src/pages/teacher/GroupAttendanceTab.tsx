import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { get, getErrorMessage, post } from '../../api/client';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
import type { AttendanceRecord, AttendanceStatus, GroupStudent } from '../../types';
import { todayStr } from '../../utils/format';

interface Props {
  groupId: number;
  students: GroupStudent[];
}

export default function GroupAttendanceTab({ groupId, students }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Tanlangan sana uchun avval saqlangan davomatni yuklaymiz.
  // Belgilanmagan talabalar sukut bo'yicha "keldi" deb turadi.
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    get<AttendanceRecord[]>('/attendance', { groupId, date })
      .then((records) => {
        if (cancelled) return;
        const saved = new Map(records.map((r) => [r.student_id, r.status]));
        const next: Record<number, AttendanceStatus> = {};
        students.forEach((s) => {
          next[s.id] = saved.get(s.id) || 'present';
        });
        setStatuses(next);
        setAlreadySaved(records.length > 0);
      })
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [groupId, date, students]);

  const setAll = (status: AttendanceStatus) => {
    const next: Record<number, AttendanceStatus> = {};
    students.forEach((s) => (next[s.id] = status));
    setStatuses(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await post('/attendance', {
        groupId,
        date,
        records: students.map((s) => ({ studentId: s.id, status: statuses[s.id] || 'present' })),
      });
      toast.success('Davomat saqlandi');
      setAlreadySaved(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter((s) => statuses[s.id] === 'present').length;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input w-auto"
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
          />
          {!loading && students.length > 0 && (
            <span className="text-sm text-slate-500">
              Keldi: <b className="text-emerald-600">{presentCount}</b> · Kelmadi:{' '}
              <b className="text-rose-600">{students.length - presentCount}</b>
              {alreadySaved && <span className="ml-2 text-xs text-slate-400">(shu sana uchun saqlangan)</span>}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary !px-3" onClick={() => setAll('present')} disabled={loading || saving}>
            Hammasi keldi
          </button>
          <button className="btn-primary" onClick={save} disabled={loading || saving || !date || students.length === 0}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            Saqlash
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <ErrorBox message={error} />
      </div>

      {loading ? (
        <Spinner />
      ) : students.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Guruhda talabalar yo'q</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="th w-12">#</th>
                <th className="th">Talaba</th>
                <th className="th text-right">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s, i) => {
                const status = statuses[s.id] || 'present';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80/70">
                    <td className="td">{i + 1}</td>
                    <td className="td font-medium text-slate-900">{s.full_name}</td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setStatuses({ ...statuses, [s.id]: 'present' })}
                          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition ${
                            status === 'present'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Check size={14} /> Keldi
                        </button>
                        <button
                          onClick={() => setStatuses({ ...statuses, [s.id]: 'absent' })}
                          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition ${
                            status === 'absent'
                              ? 'border-rose-600 bg-rose-600 text-white'
                              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <X size={14} /> Kelmadi
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
