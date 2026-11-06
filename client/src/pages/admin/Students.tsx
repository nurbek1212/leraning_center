import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { del, get, getErrorMessage, post, put } from '../../api/client';
import Badge from '../../components/Badge';
import CheckboxList from '../../components/CheckboxList';
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
import type { Group, Paged, Student } from '../../types';
import { isEmail } from '../../utils/format';

interface FormState {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  groupIds: number[];
}

type Errors = Partial<Record<'full_name' | 'email' | 'password', string>>;

function StudentForm({
  student,
  groups,
  onClose,
  onSaved,
}: {
  student: Student | null;
  groups: Group[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>({ full_name: '', email: '', password: '', phone: '', groupIds: [] });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      full_name: student?.full_name || '',
      email: student?.email || '',
      password: '',
      phone: student?.phone || '',
      groupIds: student?.groups.map((g) => g.id) || [],
    });
    setErrors({});
    setServerError('');
  }, [student]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.full_name.trim().length < 2) e.full_name = "Ism kamida 2 ta belgidan iborat bo'lishi kerak";
    if (!isEmail(form.email)) e.email = "Email noto'g'ri";
    if ((!student || form.password) && form.password.length < 6) e.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak";
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
        groupIds: form.groupIds,
      };
      if (student) await put(`/students/${student.id}`, body);
      else await post('/students', body);
      toast.success(student ? 'Talaba yangilandi' : "Talaba qo'shildi");
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
        label={student ? 'Yangi parol' : 'Parol'}
        error={errors.password}
        hint={student ? "O'zgartirmaslik uchun bo'sh qoldiring" : 'Kamida 6 ta belgi'}
      >
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </FormField>
      <FormField label="Guruhlar">
        <CheckboxList
          options={groups.map((g) => ({ id: g.id, name: `${g.name} (${g.subject_name})` }))}
          selected={form.groupIds}
          onChange={(groupIds) => setForm({ ...form, groupIds })}
          emptyText="Avval guruh qo'shing"
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

export default function Students() {
  const toast = useToast();
  const [groupFilter, setGroupFilter] = useState('');
  const list = usePagedList<Student>('/students', { groupId: groupFilter });
  const [groups, setGroups] = useState<Group[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    get<Paged<Group>>('/groups', { limit: 1000 })
      .then((d) => setGroups(d.items))
      .catch((e) => toast.error(getErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await del(`/students/${deleting.id}`);
      toast.success("Talaba o'chirildi");
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
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={list.searchInput} onChange={list.setSearchInput} placeholder="Ism, email yoki telefon..." />
            <select className="input sm:max-w-48" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="">Barcha guruhlar</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Talaba qo'shish
          </button>
        </div>
        <DataTable
          loading={list.loading}
          rows={list.items}
          rowKey={(s) => s.id}
          columns={[
            { header: 'Ism', cell: (s) => <span className="font-medium text-slate-900">{s.full_name}</span> },
            { header: 'Email', cell: (s) => s.email },
            { header: 'Telefon', cell: (s) => s.phone || '—' },
            {
              header: 'Guruhlar',
              cell: (s) =>
                s.groups.length ? (
                  <div className="flex flex-wrap gap-1">
                    {s.groups.map((g) => (
                      <Badge key={g.id} tone="blue">
                        {g.name}
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
              cell: (s) => (
                <RowActions
                  onEdit={() => {
                    setEditing(s);
                    setModalOpen(true);
                  }}
                  onDelete={() => setDeleting(s)}
                />
              ),
            },
          ]}
        />
        <Pagination page={list.page} totalPages={list.totalPages} total={list.total} limit={list.limit} onChange={list.setPage} />
      </div>

      <Modal open={modalOpen} title={editing ? 'Talabani tahrirlash' : "Yangi talaba qo'shish"} onClose={() => setModalOpen(false)}>
        <StudentForm
          student={editing}
          groups={groups}
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
        message={`"${deleting?.full_name}" talabasini o'chirmoqchimisiz? Uning baholari va davomati ham o'chadi. To'lov yozuvi bo'lsa, o'chirib bo'lmaydi.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
