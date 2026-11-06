import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { del, get, getErrorMessage, post, put } from '../../api/client';
import Badge from '../../components/Badge';
import TagInput from '../../components/TagInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import ErrorBox from '../../components/ErrorBox';
import FormField from '../../components/FormField';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import RowActions from '../../components/RowActions';
import SearchInput from '../../components/SearchInput';
import { useToast } from '../../context/ToastContext';
import { usePagedList } from '../../hooks/usePagedList';
import type { Paged, Subject, Teacher } from '../../types';
import { isEmail } from '../../utils/format';

interface FormState {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  subjectNames: string[];
}

type Errors = Partial<Record<'full_name' | 'email' | 'password', string>>;

function TeacherForm({
  teacher,
  subjects,
  onClose,
  onSaved,
}: {
  teacher: Teacher | null;
  subjects: Subject[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>({ full_name: '', email: '', password: '', phone: '', subjectNames: [] });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      full_name: teacher?.full_name || '',
      email: teacher?.email || '',
      password: '',
      phone: teacher?.phone || '',
      subjectNames: teacher?.subjects.map((s) => s.name) || [],
    });
    setErrors({});
    setServerError('');
  }, [teacher]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.full_name.trim().length < 2) e.full_name = "Ism kamida 2 ta belgidan iborat bo'lishi kerak";
    if (!isEmail(form.email)) e.email = "Email noto'g'ri";
    if (!teacher && form.password.length < 6) e.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak";
    if (teacher && form.password && form.password.length < 6) e.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    setServerError('');
    try {
      const body = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        subjectNames: form.subjectNames,
      };
      if (teacher) await put(`/teachers/${teacher.id}`, body);
      else await post('/teachers', body);
      toast.success(teacher ? 'Ustoz yangilandi' : "Ustoz qo'shildi");
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
      <FormField label="To'liq ism" error={errors.full_name}>
        <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" error={errors.email}>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>
        <FormField label="Telefon">
          <input className="input" value={form.phone} placeholder="+998901234567" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>
      </div>
      <FormField
        label={teacher ? 'Yangi parol' : 'Parol'}
        error={errors.password}
        hint={teacher ? "O'zgartirmaslik uchun bo'sh qoldiring" : 'Kamida 6 ta belgi'}
      >
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </FormField>
      <FormField label="Biriktirilgan fanlar" hint="Fan nomini yozing; yo'q bo'lsa yangi fan avtomatik yaratiladi">
        <TagInput
          value={form.subjectNames}
          onChange={(subjectNames) => setForm({ ...form, subjectNames })}
          suggestions={subjects.map((s) => s.name)}
          placeholder="Fan nomini yozing va Enter bosing"
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          Bekor qilish
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Saqlash
        </button>
      </div>
    </form>
  );
}

export default function Teachers() {
  const toast = useToast();
  const list = usePagedList<Teacher>('/teachers');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    get<Paged<Subject>>('/subjects', { limit: 1000 })
      .then((d) => setSubjects(d.items))
      .catch((e) => toast.error(getErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await del(`/teachers/${deleting.id}`);
      toast.success("Ustoz o'chirildi");
      list.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBox message={list.error} />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={list.searchInput} onChange={list.setSearchInput} placeholder="Ism, email yoki telefon..." />
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Ustoz qo'shish
          </button>
        </div>
        <DataTable
          loading={list.loading}
          rows={list.items}
          rowKey={(t) => t.id}
          columns={[
            { header: 'Ism', cell: (t) => <span className="font-medium text-slate-900">{t.full_name}</span> },
            { header: 'Email', cell: (t) => t.email },
            { header: 'Telefon', cell: (t) => t.phone || '—' },
            {
              header: 'Fanlar',
              cell: (t) =>
                t.subjects.length ? (
                  <div className="flex flex-wrap gap-1">
                    {t.subjects.map((s) => (
                      <Badge key={s.id} tone="blue">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  '—'
                ),
            },
            {
              header: 'Amallar',
              className: 'w-28 text-right',
              cell: (t) => (
                <RowActions
                  onEdit={() => {
                    setEditing(t);
                    setModalOpen(true);
                  }}
                  onDelete={() => setDeleting(t)}
                />
              ),
            },
          ]}
        />
        <Pagination page={list.page} totalPages={list.totalPages} total={list.total} limit={list.limit} onChange={list.setPage} />
      </div>

      <Modal open={modalOpen} title={editing ? 'Ustozni tahrirlash' : "Yangi ustoz qo'shish"} onClose={() => setModalOpen(false)}>
        <TeacherForm
          teacher={editing}
          subjects={subjects}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            list.reload();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        loading={deleteBusy}
        message={`"${deleting?.full_name}" ustozini o'chirmoqchimisiz? Agar ustozda guruh yoki baho bo'lsa, o'chirib bo'lmaydi.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
