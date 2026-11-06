import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BarChart3, GraduationCap, ListChecks, Loader2, Wallet } from 'lucide-react';
import { getErrorMessage } from '../api/client';
import ErrorBox from '../components/ErrorBox';
import FormField from '../components/FormField';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { homePath, isEmail } from '../utils/format';

const features = [
  { icon: <ListChecks size={18} />, text: 'Shaffof baholash mezoni — 100 ball bo‘laklarga bo‘lingan' },
  { icon: <BarChart3 size={18} />, text: 'Talaba natijalari va davomati bir joyda' },
  { icon: <Wallet size={18} />, text: "Payme va Click orqali onlayn to'lov" },
];

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner className="min-h-screen" />;
  if (user) return <Navigate to={homePath(user.role)} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = "Email manzilini to'g'ri kiriting";
    if (!password) next.password = 'Parolni kiriting';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const u = await login(email.trim(), password);
      navigate(homePath(u.role), { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-slate-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <GraduationCap size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">O'quv Markaz</span>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            O'quv markazingizni
            <br />
            bir joydan boshqaring
          </h2>
          <ul className="mt-8 space-y-4">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-white/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/40">© {new Date().getFullYear()} O'quv Markaz</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
              <GraduationCap size={24} />
            </div>
            <span className="text-xl font-bold text-slate-900">O'quv Markaz</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Xush kelibsiz</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Hisobingizga kiring</p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <ErrorBox message={serverError} />
            <FormField label="Email" error={errors.email}>
              <input className="input" type="email" autoComplete="username" placeholder="admin@markaz.uz" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="Parol" error={errors.password}>
              <input className="input" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Kirish
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">Ro'yxatdan o'tish mavjud emas. Foydalanuvchini admin yaratadi.</p>
        </div>
      </div>
    </div>
  );
}
