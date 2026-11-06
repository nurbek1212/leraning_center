import { Pencil, Trash2 } from 'lucide-react';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

export default function RowActions({ onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button className="icon-btn" onClick={onEdit} aria-label="Tahrirlash" title="Tahrirlash">
        <Pencil size={16} />
      </button>
      <button className="icon-btn hover:!bg-rose-50 hover:!text-rose-600" onClick={onDelete} aria-label="O'chirish" title="O'chirish">
        <Trash2 size={16} />
      </button>
    </div>
  );
}
