import { ReactNode, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  UserCircle,
  Users,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import { roleLabels } from '../utils/format';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}
interface NavSection {
  title?: string;
  items: NavItem[];
}

const ic = 18;

const menus: Record<Role, NavSection[]> = {
  admin: [
    { items: [{ to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={ic} />, end: true }] },
    {
      title: "O'quv jarayoni",
      items: [
        { to: '/admin/subjects', label: 'Fanlar', icon: <BookOpen size={ic} /> },
        { to: '/admin/grading', label: 'Baholash mezoni', icon: <ListChecks size={ic} /> },
        { to: '/admin/groups', label: 'Guruhlar', icon: <UsersRound size={ic} /> },
      ],
    },
    {
      title: 'Odamlar',
      items: [
        { to: '/admin/teachers', label: 'Ustozlar', icon: <GraduationCap size={ic} /> },
        { to: '/admin/students', label: 'Talabalar', icon: <Users size={ic} /> },
      ],
    },
    {
      title: 'Moliya',
      items: [{ to: '/admin/payments', label: "To'lovlar", icon: <Wallet size={ic} /> }],
    },
    { title: 'Hisob', items: [{ to: '/profile', label: 'Profil', icon: <UserCircle size={ic} /> }] },
  ],
  teacher: [
    { items: [{ to: '/teacher', label: 'Mening guruhlarim', icon: <UsersRound size={ic} />, end: true }] },
    { title: 'Hisob', items: [{ to: '/profile', label: 'Profil', icon: <UserCircle size={ic} /> }] },
  ],
  student: [
    {
      items: [
        { to: '/student', label: 'Baholarim', icon: <ClipboardList size={ic} />, end: true },
        { to: '/student/attendance', label: 'Davomatim', icon: <CalendarCheck size={ic} /> },
        { to: '/student/payments', label: "To'lovlarim", icon: <Wallet size={ic} /> },
      ],
    },
    { title: 'Hisob', items: [{ to: '/profile', label: 'Profil', icon: <UserCircle size={ic} /> }] },
  ],
};

// Sahifa nomi header uchun (aniqroq yo'llar oldin tekshiriladi)
const titles: [string, string][] = [
  ['/admin/subjects', 'Fanlar'],
  ['/admin/grading', 'Baholash mezoni'],
  ['/admin/teachers', 'Ustozlar'],
  ['/admin/students', 'Talabalar'],
  ['/admin/groups', 'Guruhlar'],
  ['/admin/payments', "To'lovlar"],
  ['/teacher/groups/', 'Guruh'],
  ['/student/attendance', 'Davomatim'],
  ['/student/payments', "To'lovlarim"],
  ['/profile', 'Profil'],
];

function pageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard';
  if (pathname === '/teacher') return 'Mening guruhlarim';
  if (pathname === '/student') return 'Baholarim';
  return titles.find(([p]) => pathname.startsWith(p))?.[1] ?? "O'quv Markaz";
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Sahifa almashganda mobil menyu yopiladi
  useEffect(() => setOpen(false), [pathname]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full">
      {open && <div className="fixed inset-0 z-30 animate-fade-in bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gradient-to-b from-brand-800 via-brand-900 to-slate-900 text-white transition-transform lg:static lg:w-64 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <GraduationCap size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight">O'quv Markaz</span>
          </div>
          <button className="rounded-lg p-1 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Yopish">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {menus[user.role].map((section, i) => (
            <div key={section.title ?? i}>
              {section.title && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{section.title}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        isActive ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/10' : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
            <Avatar name={user.full_name} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{user.full_name}</p>
              <p className="truncate text-xs text-white/50">{roleLabels[user.role]}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Chiqish"
              title="Chiqish"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button className="icon-btn lg:hidden" onClick={() => setOpen(true)} aria-label="Menyu">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">{pageTitle(pathname)}</h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-slate-900">{user.full_name}</p>
            <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
