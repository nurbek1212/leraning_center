import { KeyboardEvent, useId, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[]; // mavjud fan nomlari (tavsiya sifatida)
  max?: number; // 1 bo'lsa bitta qiymat (yangisi eskisini almashtiradi)
  placeholder?: string;
  disabled?: boolean;
}

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');

/*
 * Fan nomini yozib kiritish: yozilganda mavjud fanlar tavsiya qilinadi, yo'q bo'lsa
 * "yangi qo'shish" varianti chiqadi. Enter, vergul yoki maydondan chiqish bilan qo'shiladi.
 * Mavjud bo'lmagan fan server tomonda avtomatik yaratiladi.
 */
export default function TagInput({ value, onChange, suggestions, max = 20, placeholder, disabled }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);
  const query = normalize(text);
  const lower = query.toLowerCase();

  const options = useMemo(() => {
    const matches = suggestions
      .filter((s) => !selected.has(s.toLowerCase()) && (!lower || s.toLowerCase().includes(lower)))
      .slice(0, 8)
      .map((name) => ({ name, isNew: false }));
    const exists = suggestions.some((s) => s.toLowerCase() === lower);
    const canCreate = query.length >= 2 && !exists && !selected.has(lower);
    return canCreate ? [...matches, { name: query, isNew: true }] : matches;
  }, [suggestions, selected, lower, query]);

  const add = (raw: string) => {
    const name = normalize(raw);
    setText('');
    setActive(-1);
    if (name.length < 2 || selected.has(name.toLowerCase())) return;
    // Mavjud fan bo'lsa, uning yozilishi (katta/kichik harf) saqlanadi
    const canonical = suggestions.find((s) => s.toLowerCase() === name.toLowerCase()) ?? name;
    if (max === 1) onChange([canonical]);
    else if (value.length < max) onChange([...value, canonical]);
  };

  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
    } else if (e.key === 'Enter') {
      if (active >= 0 && options[active]) {
        e.preventDefault();
        add(options[active].name);
      } else if (query) {
        e.preventDefault(); // formani yubormaslik uchun
        add(query);
      }
    } else if (e.key === ',') {
      e.preventDefault();
      add(query);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const full = max > 1 && value.length >= max;

  return (
    <div className="relative">
      <div
        className={`flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 shadow-sm transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 ${
          disabled ? 'cursor-not-allowed bg-slate-100' : 'cursor-text hover:border-slate-400'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-1 pl-2.5 pr-1 text-sm font-medium text-brand-700">
            {v}
            {!disabled && (
              <button
                type="button"
                className="rounded p-0.5 text-brand-400 transition hover:bg-brand-100 hover:text-brand-700"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(v);
                }}
                aria-label={`${v} ni olib tashlash`}
              >
                <X size={14} />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          className="min-w-[8rem] flex-1 bg-transparent p-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          value={text}
          disabled={disabled || full}
          placeholder={value.length && max !== 1 ? '' : placeholder}
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            if (query) add(query); // yozib qo'yilgan matn yo'qolib ketmasin
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && options.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1.5 max-h-56 w-full animate-fade-in overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-pop">
          {options.map((o, i) => (
            <li
              key={`${o.isNew ? 'new' : 'old'}-${o.name}`}
              role="option"
              aria-selected={i === active}
              // onMouseDown: input blur bo'lishidan oldin tanlash ishlashi uchun
              onMouseDown={(e) => {
                e.preventDefault();
                add(o.name);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                i === active ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
              }`}
            >
              {o.isNew ? (
                <>
                  <Plus size={15} className="shrink-0" />
                  <span>
                    "<b>{o.name}</b>" yangi fan sifatida qo'shish
                  </span>
                </>
              ) : (
                o.name
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
