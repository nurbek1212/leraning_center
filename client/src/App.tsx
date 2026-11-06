import { Navigate, Route, Routes } from 'react-router-dom';
import Spinner from './components/Spinner';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminGrading from './pages/admin/GradingList';
import AdminGradingEditor from './pages/admin/GradingEditor';
import AdminGroups from './pages/admin/Groups';
import AdminPayments from './pages/admin/Payments';
import AdminStudents from './pages/admin/Students';
import AdminSubjects from './pages/admin/Subjects';
import AdminTeachers from './pages/admin/Teachers';
import Login from './pages/Login';
import Profile from './pages/Profile';
import StudentAttendance from './pages/student/MyAttendance';
import StudentGrades from './pages/student/MyGrades';
import StudentPayments from './pages/student/MyPayments';
import TeacherGroupPage from './pages/teacher/GroupPage';
import TeacherStudentPage from './pages/teacher/StudentPage';
import TeacherGroups from './pages/teacher/MyGroups';
import ProtectedRoute from './routes/ProtectedRoute';
import { homePath } from './utils/format';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  return <Navigate to={user ? homePath(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/profile" element={<Profile />} />

          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/subjects" element={<AdminSubjects />} />
            <Route path="/admin/teachers" element={<AdminTeachers />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/groups" element={<AdminGroups />} />
            <Route path="/admin/grading" element={<AdminGrading />} />
            <Route path="/admin/grading/:subjectId" element={<AdminGradingEditor />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
          </Route>

          <Route element={<ProtectedRoute role="teacher" />}>
            <Route path="/teacher" element={<TeacherGroups />} />
            <Route path="/teacher/groups/:id" element={<TeacherGroupPage />} />
            <Route path="/teacher/groups/:groupId/students/:studentId" element={<TeacherStudentPage />} />
          </Route>

          <Route element={<ProtectedRoute role="student" />}>
            <Route path="/student" element={<StudentGrades />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/payments" element={<StudentPayments />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
