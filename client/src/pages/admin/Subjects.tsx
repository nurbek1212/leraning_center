import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { del, getErrorMessage, post, put } from '../../api/client';
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
import type { Subject } from '../../types';

interface FormState {
  name: string;
  description: string;
}

function SubjectForm({
  subject,
  onClose,
  onSaved,
}: {
  subject: Subject | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>({ name: '', description: '' });
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ name: subject?.name || '', description: subject?.description || '' });
    setErrors({});
    setServerError('');
  }, [subject]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setErrors({ name: "Nomi kamida 2 ta belgidan iborat bo'lishi kerak" });
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      const body = { name: form.name.trim(), description: form.description.trim() || null };
      if (subject) await put(`/subjects/${subject.id}`, body);
      else await post('/subjects', body);
      toast.success(subject ? 'Fan yangilandi' : "Fan qo'shildi");
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
      <FormField label="Fan nomi" error={errors.name}>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </FormField>
      <FormField label="Tavsif">
        <textarea
          className="input min-h-24"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
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

export default function Subjects() {
  const toast = useToast();
  const list = usePagedList<Subject>('/subjects');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (s: Subject) => {
    setEditing(s);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await del(`/subjects/${deleting.id}`);
      toast.success("Fan o'chirildi");
      setDeleting(null);
      list.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBox message={list.error} />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={list.searchInput} onChange={list.setSearchInput} placeholder="Fan qidirish..." />
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Fan qo'shish
          </button>
        </div>
        <DataTable
          loading={list.loading}
          rows={list.items}
          rowKey={(s) => s.id}
          columns={[
            { header: '#', cell: (s) => s.id, className: 'w-16' },
            { header: 'Nomi', cell: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
            { header: 'Tavsif', cell: (s) => s.description || '—' },
            {
              header: 'Amallar',
              className: 'w-28 text-right',
              cell: (s) => <RowActions onEdit={() => openEdit(s)} onDelete={() => setDeleting(s)} />,
            },
          ]}
        />
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          limit={list.limit}
          onChange={list.setPage}
        />
      </div>

      <Modal open={modalOpen} title={editing ? 'Fanni tahrirlash' : "Yangi fan qo'shish"} onClose={() => setModalOpen(false)}>
        <SubjectForm
          subject={editing}
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
        message={`"${deleting?.name}" fanini o'chirmoqchimisiz? Ustozlarga biriktirilgan bog'lanishlar ham o'chadi.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
