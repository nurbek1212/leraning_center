import { initials } from '../utils/format';

const gradients = [
  'from-brand-500 to-violet-500',
  'from-sky-500 to-brand-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
];

// Rang ism bo'yicha doim bir xil bo'ladi
function pick(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return gradients[hash % gradients.length];
}

export default function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ${pick(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name) || '?'}
    </div>
  );
}
