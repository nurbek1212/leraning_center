import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Plus, Save, Send, Trash2 } from 'lucide-react';
import { del, getErrorMessage, post, put } from '../../api/client';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorBox from '../../components/ErrorBox';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import type { SchemeDetail } from '../../types';

interface Row {
  key: string;
  id?: number;
  name: string;
  maxScore: string;
  isExam: boolean;
  grade_count: number;
  max_used: number;
}

let counter = 0;
const newKey = () => `n${++counter}`;

export default function GradingEditor() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, setData } = useFetch<SchemeDetail>(`/grading-schemes/${subjectId}`);

  const [rows, setRows] = useState<Row[]>([]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState<'' | 'save' | 'publish' | 'unpublish' | 'delete'>('');
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Serverdan kelgan ma'lumot bo'yicha forma to'ldiriladi
  const load = (d: SchemeDetail) => {
    setRows(
      d.components.map((c) => ({
        key: `c${c.id}`,
        id: c.id,
        name: c.name,
        maxScore: String(c.max_score),
        isExam: !!c.is_exam,
        grade_count: c.grade_count,
        max_used: c.max_used,
      }))
    );
    setDescription(d.scheme?.description ?? '');
  };
  useEffect(() => {
    if (data) load(data);
  }, [data]);

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.maxScore) || 0), 0), [rows]);
  const published = data?.scheme?.status === 'published';
  const exists = !!data?.scheme;

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || 'Yuklanmadi'} />;

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = (isExam = false) =>
    setRows((rs) => [...rs, { key: newKey(), name: isExam ? 'Imtihon' : '', maxScore: '', isExam, grade_count: 0, max_used: 0 }]);

  // Brauzerda tezkor tekshiruv (asosiy tekshiruv serverda)
  const validate = (): string => {
    if (!rows.length) return "Kamida bitta qism qo'shing";
    const names = new Set<string>();
    for (const r of rows) {
      const name = r.name.trim();
      const max = Number(r.maxScore);
      if (name.length < 2) return "Har bir qism nomi kamida 2 ta belgidan iborat bo'lsin";
      if (names.has(name.toLowerCase())) return `"${name}" nomi takrorlangan`;
      names.add(name.toLowerCase());
      if (!Number.isInteger(max) || max < 1) return `"${name}" uchun ball butun son (kamida 1) bo'lsin`;
      if (r.grade_count > 0 && max < r.max_used) return `"${name}" balli ${r.max_used} dan kam bo'lishi mumkin emas (shu ball qo'yilgan)`;
    }
    if (total > 100) return `Ballar yig'indisi 100 dan oshmasligi kerak (hozir ${total})`;
    return '';
  };

  const body = () => ({
    description: description.trim() || null,
    components: rows.map((r) => ({ id: r.id, name: r.name.trim(), maxScore: Number(r.maxScore), isExam: r.isExam })),
  });

  const run = async (kind: typeof busy, fn: () => Promise<SchemeDetail | null>, okMsg: string) => {
    setBusy(kind);
    setFormError('');
    try {
      const next = await fn();
      if (next) setData(next);
      toast.success(okMsg);
      return true;
    } catch (err) {
      setFormError(getErrorMessage(err));
      return false;
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    const v = validate();
    if (v) return setFormError(v);
    await run('save', () => put<SchemeDetail>(`/grading-schemes/${subjectId}`, body()), 'Saqlandi');
  };

  const publish = async () => {
    const v = validate();
    if (v) return setFormError(v);
    if (total !== 100) return setFormError(`E'lon qilish uchun ballar yig'indisi aniq 100 bo'lishi kerak (hozir ${total})`);
    // Avval saqlanadi, keyin e'lon qilinadi
    setBusy('publish');
    setFormError('');
    try {
      await put<SchemeDetail>(`/grading-schemes/${subjectId}`, body());
      const next = await post<SchemeDetail>(`/grading-schemes/${subjectId}/publish`);
      setData(next);
      toast.success("Mezon e'lon qilindi");
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const unpublish = () => run('unpublish', () => post<SchemeDetail>(`/grading-schemes/${subjectId}/unpublish`), "Mezon e'londan olindi");

  const remove = async () => {
    setBusy('delete');
    try {
      await del(`/grading-schemes/${subjectId}`);
      toast.success("Mezon o'chirildi");
      navigate('/admin/grading', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConfirmDelete(false);
    } finally {
      setBusy('');
    }
  };

  const left = 100 - total;
  const working = busy !== '';

  return (
    <div className="space-y-5">
      <Link to="/admin/grading" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Barcha fanlar
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{data.subject.name}</h2>
        {!exists ? <Badge tone="gray">Yangi mezon</Badge> : published ? <Badge tone="green" dot>E'lon qilingan</Badge> : <Badge tone="amber" dot>Qoralama</Badge>}
      </div>

      {published && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Mezon e'lon qilingan: ustozlar shu bo'yicha baho qo'ymoqda. Ballarni o'zgartirsangiz, yig'indi aniq 100 bo'lib qolishi shart,
          qo'yilgan baholari bor qismni o'chirib bo'lmaydi.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Mezon qismlari</h3>
            <div className="flex gap-2">
              <button className="btn-secondary !py-2" onClick={() => addRow(false)} disabled={working}>
                <Plus size={16} /> Qism
              </button>
              <button className="btn-secondary !py-2" onClick={() => addRow(true)} disabled={working}>
                <Plus size={16} /> Imtihon
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
              Hali qism yo'q. "Qism" yoki "Imtihon" tugmasini bosing.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_6.5rem_5.5rem_2.5rem] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
                <span>Nomi</span>
                <span>Ball</span>
                <span>Imtihon</span>
                <span />
              </div>
              {rows.map((r) => (
                <div key={r.key} className="grid grid-cols-[1fr_5.5rem] items-center gap-3 rounded-xl bg-slate-50 p-2 sm:grid-cols-[1fr_6.5rem_5.5rem_2.5rem]">
                  <input
                    className="input"
                    placeholder="Masalan: Oraliq imtihon"
                    value={r.name}
                    onChange={(e) => update(r.key, { name: e.target.value })}
                    aria-label="Qism nomi"
                  />
                  <input
                    className="input tabular"
                    inputMode="numeric"
                    placeholder="0"
                    value={r.maxScore}
                    onChange={(e) => update(r.key, { maxScore: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    aria-label="Maksimal ball"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-brand"
                      checked={r.isExam}
                      onChange={(e) => update(r.key, { isExam: e.target.checked })}
                    />
                    Imtihon
                  </label>
                  <button
                    className="icon-btn justify-self-end hover:!bg-rose-50 hover:!text-rose-600 disabled:opacity-30"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    disabled={r.grade_count > 0 || working}
                    title={r.grade_count > 0 ? `${r.grade_count} ta baho qo'yilgan, o'chirib bo'lmaydi` : "O'chirish"}
                    aria-label="O'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                  {r.grade_count > 0 && (
                    <p className="col-span-full -mt-1 px-1 text-xs text-slate-400">
                      {r.grade_count} ta baho qo'yilgan · eng yuqori ball: {r.max_used}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Izoh (talabalar ham ko'radi)</label>
            <textarea
              className="input min-h-20"
              maxLength={500}
              placeholder="Masalan: Yakuniy imtihondan kamida 15 ball to'plash shart"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card flex flex-col items-center p-5">
            <ScoreRing value={total} max={100} size={132} caption="/ 100" />
            <p className={`mt-3 text-sm font-medium ${left === 0 ? 'text-emerald-600' : left < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              {left === 0 ? "Hammasi taqsimlangan" : left > 0 ? `${left} ball taqsimlanmagan` : `${-left} ball ortiqcha`}
            </p>
          </div>

          <div className="card space-y-2.5 p-5">
            <ErrorBox message={formError} />
            <button className="btn-secondary w-full" onClick={save} disabled={working}>
              {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {published ? 'Saqlash' : 'Qoralamani saqlash'}
            </button>
            {!published && (
              <button className="btn-primary w-full" onClick={publish} disabled={working || total !== 100}>
                {busy === 'publish' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                E'lon qilish
              </button>
            )}
            {!published && total !== 100 && <p className="text-xs text-slate-400">E'lon qilish uchun yig'indi aniq 100 bo'lishi kerak.</p>}
            {published && (
              <button className="btn-secondary w-full" onClick={unpublish} disabled={working}>
                {busy === 'unpublish' ? <Loader2 size={16} className="animate-spin" /> : <EyeOff size={16} />}
                E'londan olish
              </button>
            )}
            {exists && (
              <button className="btn-ghost w-full !text-rose-600 hover:!bg-rose-50" onClick={() => setConfirmDelete(true)} disabled={working}>
                <Trash2 size={16} /> Mezonni o'chirish
              </button>
            )}
          </div>

          {!published && (
            <p className="flex items-start gap-2 px-1 text-xs text-slate-400">
              <Eye size={14} className="mt-0.5 shrink-0" /> Qoralamani faqat admin ko'radi.
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        loading={busy === 'delete'}
        message="Mezonni o'chirmoqchimisiz? Agar shu mezon bo'yicha baholar qo'yilgan bo'lsa, o'chirib bo'lmaydi."
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
