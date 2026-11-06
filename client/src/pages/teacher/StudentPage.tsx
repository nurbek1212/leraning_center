import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Mail, Phone, Plus } from 'lucide-react';
import { del, getErrorMessage } from '../../api/client';
import Avatar from '../../components/Avatar';
import Badge, { scoreTone } from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorBox from '../../components/ErrorBox';
import Modal from '../../components/Modal';
import ProgressBar from '../../components/ProgressBar';
import RowActions from '../../components/RowActions';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import type { StudentDetail, StudentGradeRow } from '../../types';
import { attendanceLabels, fmtScore, formatDate, percentOf } from '../../utils/format';
import GradeForm from './GradeForm';

export default function StudentPage() {
  const { groupId, studentId } = useParams();
  const gid = Number(groupId);
  const sid = Number(studentId);
  const valid = Number.isInteger(gid) && gid > 0 && Number.isInteger(sid) && sid > 0;
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<StudentDetail>(valid ? `/groups/${gid}/students/${sid}` : null);

  const [form, setForm] = useState<{ open: boolean; grade: StudentGradeRow | null; preset: number | null }>({
    open: false,
    grade: null,
    preset: null,
  });
  const [deleting, setDeleting] = useState<StudentGradeRow | null>(null);
  const [busy, setBusy] = useState(false);

  const back = (
    <Link to={`/teacher/groups/${gid}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
      <ArrowLeft size={16} /> Guruhga qaytish
    </Link>
  );

  if (loading && !data) return <Spinner />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorBox message={error || 'Talaba topilmadi'} />
      </div>
    );
  }

  const { group, student, breakdown, grades, attendance } = data;
  const published = breakdown?.scheme_status === 'published';
  const components = breakdown?.components ?? [];

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await del(`/grades/${deleting.id}`);
      toast.success("Baho o'chirildi");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const openCreate = (preset: number | null = null) => setForm({ open: true, grade: null, preset });
  const close = () => setForm({ open: false, grade: null, preset: null });

  return (
    <div className="space-y-5">
      {back}

      {/* Talaba ma'lumotlari */}
      <div className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <Avatar name={student.full_name} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold tracking-tight text-slate-900">{student.full_name}</h2>
          <p className="text-sm text-brand-600">
            {group.name} · {group.subject_name}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Mail size={14} /> {student.email}
            </span>
            {student.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={14} /> {student.phone}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarCheck size={14} /> Davomat:{' '}
              {attendance.summary.total ? `${attendance.summary.percent}% (${attendance.summary.present}/${attendance.summary.total})` : '—'}
            </span>
          </div>
        </div>
        {breakdown && breakdown.max_total > 0 && <ScoreRing value={breakdown.total} max={breakdown.max_total} caption={`/ ${breakdown.max_total}`} />}
      </div>

      {!breakdown || components.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Bu fan uchun baholash mezoni yo'q"
            text="Administrator mezon tuzib, e'lon qilgandan keyin baho qo'yish mumkin bo'ladi."
          />
        </div>
      ) : (
        <>
          {!published && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mezon hali e'lon qilinmagan (qoralama). Administrator e'lon qilmaguncha baho qo'yib bo'lmaydi.
            </div>
          )}

          {/* Mezon bo'yicha natija */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Mezon bo'yicha natija</h3>
              <button className="btn-primary !py-2" onClick={() => openCreate()} disabled={!published}>
                <Plus size={16} /> Baho qo'yish
              </button>
            </div>
            {breakdown.scheme_description && <p className="mb-4 text-sm text-slate-500">{breakdown.scheme_description}</p>}
            <div className="space-y-4">
              {components.map((c) => (
                <div key={c.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-slate-800">{c.name}</span>
                      {c.is_exam && <Badge tone="blue">Imtihon</Badge>}
                      <span className="text-xs text-slate-400">{c.count} ta baho</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-slate-500">
                        <b className="text-slate-900">{fmtScore(c.earned)}</b> / {c.max_score}
                      </span>
                      <button
                        className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-40 disabled:no-underline"
                        onClick={() => openCreate(c.id)}
                        disabled={!published}
                      >
                        + Baho
                      </button>
                    </span>
                  </div>
                  <ProgressBar value={c.earned ?? 0} max={c.max_score} />
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              Qism natijasi — shu qismdagi baholarning o'rtachasi. Jami ball — qismlar natijalari yig'indisi.
            </p>
          </div>

          {/* Baholar tarixi */}
          <div className="card overflow-hidden">
            <h3 className="px-5 pt-5 font-semibold text-slate-900">Baholar tarixi</h3>
            {grades.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Hali baho qo'yilmagan</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-y border-slate-100 bg-slate-50/80">
                    <tr>
                      <th className="th">Sana</th>
                      <th className="th">Qism</th>
                      <th className="th">Ball</th>
                      <th className="th">Izoh</th>
                      <th className="th" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/70">
                        <td className="td">{formatDate(g.date)}</td>
                        <td className="td">{g.component_name}</td>
                        <td className="td">
                          <Badge tone={scoreTone(percentOf(g.score, g.max_score))}>
                            {fmtScore(g.score)} / {g.max_score}
                          </Badge>
                        </td>
                        <td className="td text-slate-500">{g.comment || '—'}</td>
                        <td className="td">
                          {published && <RowActions onEdit={() => setForm({ open: true, grade: g, preset: null })} onDelete={() => setDeleting(g)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Davomat */}
      {attendance.records.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-semibold text-slate-900">So'nggi davomat</h3>
          <div className="flex flex-wrap gap-2">
            {attendance.records.slice(0, 20).map((r) => (
              <Badge key={r.id} tone={r.status === 'present' ? 'green' : 'red'}>
                {formatDate(r.date)} · {attendanceLabels[r.status]}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={form.open}
        title={form.grade ? 'Bahoni tahrirlash' : `Baho qo'yish — ${student.full_name}`}
        onClose={close}
      >
        <GradeForm
          key={form.grade ? `e${form.grade.id}` : `n${form.preset ?? 0}`}
          groupId={gid}
          studentId={sid}
          components={components}
          grade={form.grade}
          presetComponentId={form.preset}
          onCancel={close}
          onSaved={() => {
            close();
            reload();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        loading={busy}
        message={`${deleting?.component_name} bo'yicha ${deleting ? fmtScore(deleting.score) : ''} ballik bahoni o'chirmoqchimisiz?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
