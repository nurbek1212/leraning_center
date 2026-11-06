import { Navigate, Outlet } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import { homePath } from '../utils/format';

// Kirmagan foydalanuvchi /login ga, noto'g'ri rol esa o'z bosh sahifasiga yo'naltiriladi
export default function ProtectedRoute({ role }: { role?: Role }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homePath(user.role)} replace />;

  return <Outlet />;
}
