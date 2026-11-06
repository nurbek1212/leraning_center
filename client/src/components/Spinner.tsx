export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`} role="status" aria-label="Yuklanmoqda">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
    </div>
  );
}
