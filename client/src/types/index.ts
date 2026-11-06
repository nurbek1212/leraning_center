export type Role = 'admin' | 'teacher' | 'student';
export type AttendanceStatus = 'present' | 'absent';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'payme' | 'click';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';
export type SchemeStatus = 'draft' | 'published';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
}

export interface ProfileGroup {
  id: number;
  name: string;
  schedule: string | null;
  subject_name: string;
  teacher_name?: string;
}

export interface Profile extends User {
  created_at: string;
  groups: ProfileGroup[];
  subjects: { id: number; name: string }[];
}

export interface Subject {
  id: number;
  name: string;
  description: string | null;
}

export interface Teacher {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  subjects: { id: number; name: string }[];
}

export interface Student {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  groups: { id: number; name: string }[];
}

export interface Group {
  id: number;
  name: string;
  subject_id: number;
  teacher_id: number;
  schedule: string | null;
  price: number;
  created_at: string;
  subject_name: string;
  teacher_name: string;
  student_count: number;
}

// ---------- Baholash mezoni ----------

export interface SchemeSummary {
  subject_id: number;
  subject_name: string;
  scheme_id: number | null;
  status: SchemeStatus | null;
  published_at: string | null;
  component_count: number;
  total: number;
  grade_count: number;
  group_count: number;
}

export interface SchemeComponent {
  id: number;
  name: string;
  max_score: number;
  is_exam: boolean;
  grade_count: number;
  max_used: number;
}

export interface SchemeDetail {
  subject: { id: number; name: string };
  scheme: { id: number; description: string | null; status: SchemeStatus; published_at: string | null } | null;
  components: SchemeComponent[];
  total: number;
}

export interface ComponentResult {
  id: number;
  name: string;
  max_score: number;
  is_exam: boolean;
  earned: number | null;
  count: number;
}

export interface GroupBreakdown {
  group_id: number;
  group_name: string;
  subject_id: number;
  subject_name: string;
  scheme_status: SchemeStatus | null;
  scheme_description: string | null;
  components: ComponentResult[];
  total: number;
  max_total: number;
  grades_count: number;
}

// ---------- Baholar ----------

export interface Grade {
  id: number;
  student_id: number;
  group_id: number;
  teacher_id: number;
  component_id: number;
  score: number;
  comment: string | null;
  date: string;
  student_name: string;
  group_name: string;
  subject_name: string;
  component_name: string;
  max_score: number;
  is_exam: number | boolean;
}

export interface GroupStudent {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  total: number | null;
  grades_count: number;
  attendance_percent: number | null;
}

export interface GroupDetail {
  group: {
    id: number;
    name: string;
    subject_name: string;
    schedule: string | null;
    scheme: { status: SchemeStatus; max_total: number } | null;
  };
  students: GroupStudent[];
}

export interface StudentGradeRow {
  id: number;
  component_id: number;
  score: number;
  comment: string | null;
  date: string;
  component_name: string;
  max_score: number;
  is_exam: number | boolean;
}

export interface AttendanceRecord {
  id: number;
  group_id: number;
  student_id: number;
  student_name: string;
  date: string;
  status: AttendanceStatus;
}

export interface StudentDetail {
  group: { id: number; name: string; subject_name: string; schedule: string | null };
  student: { id: number; full_name: string; email: string; phone: string | null; created_at: string };
  breakdown: GroupBreakdown | null;
  grades: StudentGradeRow[];
  attendance: {
    records: { id: number; date: string; status: AttendanceStatus }[];
    summary: { total: number; present: number; absent: number; percent: number };
  };
}

export interface MyGrade {
  id: number;
  score: number;
  comment: string | null;
  date: string;
  group_id: number;
  group_name: string;
  subject_id: number;
  subject_name: string;
  component_name: string;
  max_score: number;
  is_exam: number | boolean;
  teacher_name: string;
}

export interface MyGrades {
  groups: GroupBreakdown[];
  grades: MyGrade[];
  overall: number | null;
}

export interface MyAttendanceRecord {
  id: number;
  date: string;
  status: AttendanceStatus;
  group_id: number;
  group_name: string;
  subject_name: string;
}

export interface MyAttendance {
  records: MyAttendanceRecord[];
  summary: { total: number; present: number; absent: number; percent: number };
}

// ---------- To'lovlar ----------

export interface Payment {
  id: number;
  student_id: number;
  group_id: number;
  period: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  note: string | null;
  created_at: string;
  paid_at: string | null;
  student_name: string;
  group_name: string;
  recorded_by_name: string | null;
}

export interface DebtRow {
  student_id: number;
  student_name: string;
  phone: string | null;
  group_id: number;
  group_name: string;
  price: number;
  paid: number;
  debt: number;
}

export interface DebtsResponse {
  period: string;
  items: DebtRow[];
}

export interface MyPaymentGroup {
  group_id: number;
  group_name: string;
  subject_name: string;
  price: number;
  paid: number;
  debt: number;
}

export interface MyPaymentHistory {
  id: number;
  group_id: number;
  group_name: string;
  period: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
}

export interface MyPayments {
  period: string;
  providers: { payme: boolean; click: boolean };
  groups: MyPaymentGroup[];
  history: MyPaymentHistory[];
}

export interface CheckoutResult {
  paymentId: number;
  provider: 'payme' | 'click';
  amount: number;
  url: string;
}

export interface DashboardStats {
  counts: { students: number; teachers: number; groups: number; subjects: number };
  studentsBySubject: { id: number; name: string; students: number }[];
  averageByGroup: { id: number; name: string; average: number }[];
  latestGrades: {
    id: number;
    score: number;
    date: string;
    component_name: string;
    max_score: number;
    student_name: string;
    group_name: string;
    teacher_name: string;
  }[];
  payments: { period: string; paid: number; expected: number; debt: number };
}
