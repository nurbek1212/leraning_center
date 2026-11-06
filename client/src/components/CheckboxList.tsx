interface Option {
  id: number;
  name: string;
}

interface Props {
  options: Option[];
  selected: number[];
  onChange: (selected: number[]) => void;
  emptyText?: string;
}

// Bir nechta variantni belgilash uchun (fanlar, guruhlar)
export default function CheckboxList({ options, selected, onChange, emptyText = "Variantlar yo'q" }: Props) {
  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  if (options.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-300 p-2">
      {options.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 accent-brand"
            checked={selected.includes(o.id)}
            onChange={() => toggle(o.id)}
          />
          {o.name}
        </label>
      ))}
    </div>
  );
}
