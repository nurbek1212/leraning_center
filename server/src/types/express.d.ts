export type Role = 'admin' | 'teacher' | 'student';

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
