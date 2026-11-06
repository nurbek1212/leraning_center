-- Eski bazani (001_payments.sql dan keyin) yangilash: baholash mezoni + fan nomi UNIQUE.
-- Yangi o'rnatishda kerak emas: `npm run db:setup` schema.sql ni to'liq yaratadi (mavjud ma'lumotni o'chiradi!).
--
-- Ishlatish:  mysql -u root -p oquv_markaz < database/migrations/002_grading_and_unique_subjects.sql
-- Faqat BIR MARTA bajaring. Oldin bazadan zaxira nusxa oling.
--
-- Nima qiladi:
--  * subjects.name ni UNIQUE qiladi (agar bir xil nomli fanlar bo'lsa, bu qadam xato beradi:
--    avval takrorlarni birlashtiring yoki nomini o'zgartiring).
--  * Har bir fan uchun e'lon qilingan mezon yaratadi: bitta "Umumiy baho" (100 ball).
--  * Eski baholarni shu komponentga bog'laydi (ball 0..100 saqlanadi), grades.type ustunini olib tashlaydi.
--  Keyin admin "Baholash mezoni" sahifasida mezonni xohlagancha taqsimlashi mumkin.
USE oquv_markaz;

ALTER TABLE subjects ADD UNIQUE KEY uniq_subject_name (name);

CREATE TABLE grading_schemes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL UNIQUE,
  description VARCHAR(500),
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE grading_components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scheme_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  max_score INT NOT NULL CHECK (max_score BETWEEN 1 AND 100),
  is_exam TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_component_name (scheme_id, name),
  FOREIGN KEY (scheme_id) REFERENCES grading_schemes(id) ON DELETE CASCADE
);

INSERT INTO grading_schemes (subject_id, description, status, published_at)
SELECT id, 'Avvalgi baholar uchun avtomatik yaratilgan mezon', 'published', NOW() FROM subjects;

INSERT INTO grading_components (scheme_id, name, max_score, is_exam, sort_order)
SELECT id, 'Umumiy baho', 100, 0, 1 FROM grading_schemes;

ALTER TABLE grades ADD COLUMN component_id INT NULL AFTER teacher_id;

UPDATE grades g
JOIN `groups` gr ON gr.id = g.group_id
JOIN grading_schemes s ON s.subject_id = gr.subject_id
JOIN grading_components c ON c.scheme_id = s.id
SET g.component_id = c.id;

ALTER TABLE grades
  MODIFY component_id INT NOT NULL,
  ADD CONSTRAINT fk_grades_component FOREIGN KEY (component_id) REFERENCES grading_components(id),
  ADD INDEX idx_grades_lookup (group_id, student_id, component_id),
  DROP COLUMN type;
