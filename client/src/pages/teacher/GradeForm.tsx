import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getErrorMessage, post, put } from '../../api/client';
import ErrorBox from '../../components/ErrorBox';
import FormField from '../../components/FormField';
import { useToast } from '../../context/ToastContext';
import { fmtScore, todayStr } from '../../utils/format';

export interface ComponentOption {
  id: number;
  name: string;
  max_score: number;
  earned?: number | null;
}

export interface EditableGrade {
  id: number;
  component_id: number;
  component_name: string;
  max_score: number;
  score: number;
  comment: string | null;
  date: string;
}

interface Props {
  groupId: number;
  studentId: number; // talaba oldindan aniq: qayta tanlanmaydi
  components: ComponentOption[]; // yangi baho uchun tanlanadigan mezon qismlari
  grade?: EditableGrade | null; // berilsa — tahrirlash rejimi (mezon qismi o'zgarmaydi)
  presetComponentId?: number | null;
  onSaved: () => void;
  onCancel?: () => void;
}

// Baho qo'yish/tahrirlash formasi. Talaba va guruh tashqaridan beriladi.
export default function GradeForm({ groupId, studentId, components, grade, presetComponentId, onSaved, onCancel }: Props) {
  const toast = useToast();
  const [componentId, setComponentId] = useState<string>(
    grade ? String(grade.component_id) : presetComponentId ? String(presetComponentId) : ''
  );
  const [score, setScore] = useState(grade ? String(grade.score) : '');
  const [date, setDate] = useState(grade ? grade.date.slice(0, 10) : todayStr());
  const [comment, setComment] = useState(grade?.comment ?? '');
  const [errors, setErrors] = useState<Partial<Record<'component' | 'score' | 'date', string>>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const chosen = grade
    ? { id: grade.component_id, name: grade.component_name, max_score: grade.max_score }
    : components.find((c) => String(c.id) === componentId);
  const max = chosen?.max_score;

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: typeof errors = {};
    const value = Number(score);
    if (!chosen) e.component = 'Mezon qismini tanlang';
    if (score.trim() === '' || !Number.isInteger(value) || value < 0) e.score = "Ballni butun son qilib kiriting";
    else if (max !== undefined && value > max) e.score = `Ball ${max} dan oshmasligi kerak`;
    if (!date) e.date = 'Sanani kiriting';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    setServerError('');
    try {
      const base = { score: value, comment: comment.trim() || null, date };
      if (grade) await put(`/grades/${grade.id}`, base);
      else await post('/grades', { ...base, studentId, groupId, componentId: Number(componentId) });
      toast.success(grade ? 'Baho yangilandi' : "Baho qo'yildi");
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorBox message={serverError} />
      <FormField label="Mezon qismi" error={errors.component}>
        {grade ? (
          <p className="input bg-slate-50 text-slate-600">
            {grade.component_name} <span className="text-slate-400">(maks. {grade.max_score})</span>
          </p>
        ) : (
          <select className="input" value={componentId} onChange={(e) => setComponentId(e.target.value)}>
            <option value="">Tanlang...</option>
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — maks. {c.max_score}
                {c.earned != null ? ` (hozir: ${fmtScore(c.earned)})` : ''}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={max ? `Ball (0–${max})` : 'Ball'} error={errors.score}>
          <input
            className="input tabular"
            inputMode="numeric"
            autoFocus
            value={score}
            onChange={(e) => setScore(e.target.value.replace(/\D/g, '').slice(0, 3))}
          />
        </FormField>
        <FormField label="Sana" error={errors.date}>
          <input className="input" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Izoh">
        <input className="input" maxLength={255} value={comment} onChange={(e) => setComment(e.target.value)} />
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Bekor qilish
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {grade ? 'Saqlash' : "Baho qo'yish"}
        </button>
      </div>
    </form>
  );
}
