import { z } from 'zod';

const id = z.coerce.number().int().positive();

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD formatida bo'lishi kerak")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Sana noto'g'ri");

const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Oy YYYY-MM formatida bo'lishi kerak");

const phone = z.string().trim().max(20, "Telefon 20 belgidan oshmasligi kerak").optional().nullable();
const fullName = z
  .string()
  .trim()
  .min(2, "Ism kamida 2 ta belgidan iborat bo'lishi kerak")
  .max(100, "Ism 100 belgidan oshmasligi kerak");
const email = z.string().trim().toLowerCase().email("Email noto'g'ri").max(100);
const newPassword = z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak").max(100);
const optionalPassword = z.union([newPassword, z.literal('')]).optional();

// Fan nomi yozib kiritiladi: ortiqcha bo'sh joylar tozalanadi
const subjectName = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(2, "Fan nomi kamida 2 ta belgidan iborat bo'lishi kerak")
      .max(100, "Fan nomi 100 belgidan oshmasligi kerak")
  );

// ---------- Umumiy ----------

export const idParam = z.object({ id });
export const subjectIdParam = z.object({ subjectId: id });
export const groupStudentParams = z.object({ id, studentId: id });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
  search: z.string().trim().default(''),
});

export const studentListQuery = listQuery.extend({
  groupId: id.optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email noto'g'ri"),
  password: z.string().min(1, 'Parolni kiriting'),
});

// ---------- Fanlar, ustozlar, talabalar, guruhlar ----------

export const subjectSchema = z.object({
  name: subjectName,
  description: z.string().trim().max(1000).optional().nullable(),
});

const subjectNames = z.array(subjectName).max(20, "Bir ustozga ko'pi bilan 20 ta fan biriktiriladi").default([]);

export const teacherCreateSchema = z.object({
  full_name: fullName,
  email,
  password: newPassword,
  phone,
  subjectNames,
});

export const teacherUpdateSchema = z.object({
  full_name: fullName,
  email,
  password: optionalPassword,
  phone,
  subjectNames,
});

export const studentCreateSchema = z.object({
  full_name: fullName,
  email,
  password: newPassword,
  phone,
  groupIds: z.array(id).default([]),
});

export const studentUpdateSchema = z.object({
  full_name: fullName,
  email,
  password: optionalPassword,
  phone,
  groupIds: z.array(id).default([]),
});

export const groupSchema = z.object({
  name: z.string().trim().min(2, "Nomi kamida 2 ta belgidan iborat bo'lishi kerak").max(100),
  subjectName,
  teacherId: id,
  schedule: z.string().trim().max(100).optional().nullable(),
  price: z.coerce
    .number({ invalid_type_error: "Narx son bo'lishi kerak" })
    .int("Narx butun son bo'lishi kerak")
    .min(0, "Narx manfiy bo'lmasligi kerak")
    .max(100_000_000, 'Narx juda katta')
    .default(0),
});

// ---------- Baholash mezoni ----------

const componentSchema = z.object({
  id: id.optional(), // mavjud mezon bo'lsa id keladi, yangi bo'lsa yo'q
  name: z
    .string()
    .trim()
    .min(2, "Mezon nomi kamida 2 ta belgidan iborat bo'lishi kerak")
    .max(100, 'Mezon nomi 100 belgidan oshmasligi kerak'),
  maxScore: z.coerce
    .number({ invalid_type_error: "Ball son bo'lishi kerak" })
    .int("Ball butun son bo'lishi kerak")
    .min(1, "Ball kamida 1 bo'lishi kerak")
    .max(100, "Ball 100 dan oshmasligi kerak"),
  isExam: z.boolean().default(false),
});

export const gradingSchemeSchema = z
  .object({
    description: z.string().trim().max(500, 'Izoh 500 belgidan oshmasligi kerak').optional().nullable(),
    components: z.array(componentSchema).min(1, "Kamida bitta mezon qo'shing").max(20, "Ko'pi bilan 20 ta mezon"),
  })
  .superRefine((value, ctx) => {
    const names = new Set<string>();
    for (const c of value.components) {
      const key = c.name.toLowerCase();
      if (names.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${c.name}" nomi takrorlangan`, path: ['components'] });
        break;
      }
      names.add(key);
    }
    const total = value.components.reduce((sum, c) => sum + c.maxScore, 0);
    if (total > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Ballar yig'indisi 100 dan oshmasligi kerak (hozir ${total})`,
        path: ['components'],
      });
    }
  });

// ---------- Baholar ----------

const score = z.coerce
  .number({ invalid_type_error: "Ball son bo'lishi kerak" })
  .int("Ball butun son bo'lishi kerak")
  .min(0, "Ball 0 dan kam bo'lmasligi kerak")
  .max(100, "Ball 100 dan oshmasligi kerak");

export const gradeCreateSchema = z.object({
  studentId: id,
  groupId: id,
  componentId: id,
  score,
  comment: z.string().trim().max(255, "Izoh 255 belgidan oshmasligi kerak").optional().nullable(),
  date: dateStr,
});

export const gradeUpdateSchema = z.object({
  score,
  comment: z.string().trim().max(255, "Izoh 255 belgidan oshmasligi kerak").optional().nullable(),
  date: dateStr,
});

export const gradeQuery = z.object({
  groupId: id.optional(),
  studentId: id.optional(),
});

// ---------- Davomat ----------

export const attendanceCreateSchema = z.object({
  groupId: id,
  date: dateStr,
  records: z
    .array(
      z.object({
        studentId: id,
        status: z.enum(['present', 'absent'], {
          errorMap: () => ({ message: "Holat 'present' yoki 'absent' bo'lishi kerak" }),
        }),
      })
    )
    .min(1, 'Kamida bitta talaba belgilanishi kerak'),
});

export const attendanceQuery = z.object({
  groupId: id,
  date: dateStr.optional(),
});

// ---------- To'lovlar ----------

export const paymentListQuery = listQuery.extend({
  period: period.optional(),
  status: z.enum(['pending', 'paid', 'cancelled']).optional(),
});

export const periodQuery = z.object({
  period: period.optional(),
});

export const paymentCreateSchema = z.object({
  studentId: id,
  groupId: id,
  period,
  amount: z.coerce
    .number({ invalid_type_error: "Summa son bo'lishi kerak" })
    .int("Summa butun son bo'lishi kerak")
    .min(1, "Summa 0 dan katta bo'lishi kerak")
    .max(1_000_000_000, 'Summa juda katta'),
  method: z.enum(['cash', 'card', 'transfer'], {
    errorMap: () => ({ message: "To'lov usuli noto'g'ri" }),
  }),
  note: z.string().trim().max(255, "Izoh 255 belgidan oshmasligi kerak").optional().nullable(),
});

export const checkoutSchema = z.object({
  groupId: id,
  period,
  provider: z.enum(['payme', 'click'], { errorMap: () => ({ message: "To'lov tizimi noto'g'ri" }) }),
});
