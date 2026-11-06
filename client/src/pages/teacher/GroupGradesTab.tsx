import { useState } from 'react';
import { Link } from 'react-router-dom';
import { del, getErrorMessage } from '../../api/client';
import Badge, { scoreTone } from '../../components/Badge';
import ClientTable from '../../components/ClientTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorBox from '../../components/ErrorBox';
import Modal from '../../components/Modal';
import RowActions from '../../components/RowActions';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import type { Grade } from '../../types';
import { fmtScore, formatDate, percentOf } from '../../utils/format';
import GradeForm from './GradeForm';

interface Props {
  groupId: number;
  published: boolean;
  onChanged: () => void;
}

// Guruhdagi barcha baholar. Yangi baho talaba sahifasidan qo'yiladi (talabani qayta tanlash shart emas),
// bu yerda faqat tahrirlash va o'chirish.
export default function GroupGradesTab({ groupId, published, onChanged }: Props) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<Grade[]>('/grades', { groupId });
  const [editing, setEditing] = useState<Grade | null>(null);
  const [deleting, setDeleting] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    reload();
    onChanged();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await del(`/grades/${deleting.id}`);
      toast.success("Baho o'chirildi");
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBox message={error} />
      <p className="text-sm text-slate-500">
        Yangi baho qo'yish uchun <b>Talabalar</b> bo'limidan talabani oching.
      </p>
      <ClientTable
        loading={loading}
        rows={data ?? []}
        rowKey={(g) => g.id}
        searchText={(g) => `${g.student_name} ${g.component_name}`}
        searchPlaceholder="Talaba yoki mezon qismi..."
        emptyText="Hali baho qo'yilmagan"
        columns={[
          { header: 'Sana', cell: (g) => formatDate(g.date) },
          {
            header: 'Talaba',
            cell: (g) => (
              <Link to={`/teacher/groups/${groupId}/students/${g.student_id}`} className="font-medium text-slate-900 hover:text-brand-600">
                {g.student_name}
              </Link>
            ),
          },
          { header: 'Qism', cell: (g) => g.component_name },
          {
            header: 'Ball',
            cell: (g) => (
              <Badge tone={scoreTone(percentOf(g.score, g.max_score))}>
                {fmtScore(g.score)} / {g.max_score}
              </Badge>
            ),
          },
          { header: 'Izoh', cell: (g) => <span className="text-slate-500">{g.comment || '—'}</span> },
          {
            header: '',
            className: 'w-28 text-right',
            cell: (g) => (published ? <RowActions onEdit={() => setEditing(g)} onDelete={() => setDeleting(g)} /> : null),
          },
        ]}
      />

      <Modal open={!!editing} title="Bahoni tahrirlash" onClose={() => setEditing(null)}>
        {editing && (
          <GradeForm
            key={editing.id}
            groupId={groupId}
            studentId={editing.student_id}
            components={[]}
            grade={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        loading={busy}
        message={`${deleting?.student_name} — ${deleting?.component_name} bahosini o'chirmoqchimisiz?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
