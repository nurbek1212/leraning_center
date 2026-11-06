-- MySQL 8.0.16+ talab qilinadi (CHECK cheklovi uchun)
CREATE DATABASE IF NOT EXISTS oquv_markaz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE oquv_markaz;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS grading_components;
DROP TABLE IF EXISTS grading_schemes;
DROP TABLE IF EXISTS group_students;
DROP TABLE IF EXISTS `groups`;
DROP TABLE IF EXISTS teacher_subjects;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ===== FOYDALANUVCHILAR, FANLAR, GURUHLAR =====
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','teacher','student') NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fan nomi UNIQUE (kichik/katta harfga e'tiborsiz): fan yozib kiritilganda bir xil nom ikki marta yaratilmaydi
CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE teacher_subjects (
  teacher_id INT NOT NULL,
  subject_id INT NOT NULL,
  PRIMARY KEY (teacher_id, subject_id),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE `groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  schedule VARCHAR(100),
  price INT NOT NULL DEFAULT 0, -- oylik to'lov (so'mda)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE group_students (
  group_id INT NOT NULL,
  student_id INT NOT NULL,
  PRIMARY KEY (group_id, student_id),
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===== BAHOLASH MEZONI =====
-- Har bir fan uchun bitta mezon. Admin 100 ballni qismlarga (komponentlarga) bo'ladi va e'lon qiladi.
-- Faqat e'lon qilingan (published) mezon bo'yicha baho qo'yish mumkin.
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

-- ===== BAHOLAR VA DAVOMAT =====
-- Baho mezon komponentiga bog'lanadi; ball komponentning max_score qiymatidan oshmaydi (server tekshiradi).
-- Komponent bo'yicha bir nechta baho bo'lsa, komponent natijasi ularning o'rtachasi bo'ladi.
CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  group_id INT NOT NULL,
  teacher_id INT NOT NULL,
  component_id INT NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  comment VARCHAR(255),
  date DATE NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (component_id) REFERENCES grading_components(id),
  INDEX idx_grades_lookup (group_id, student_id, component_id)
);

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  student_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('present','absent') NOT NULL,
  UNIQUE KEY uniq_att (group_id, student_id, date),
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===== TO'LOVLAR =====
-- To'lovlar moliyaviy yozuv: talaba yoki guruh o'chirilganda yo'qolib ketmasligi uchun
-- ON DELETE CASCADE ishlatilmagan (to'lovi bor talabani/guruhni o'chirib bo'lmaydi).
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  group_id INT NOT NULL,
  period CHAR(7) NOT NULL,                       -- qaysi oy uchun: 'YYYY-MM'
  amount INT NOT NULL CHECK (amount > 0),        -- so'mda
  method ENUM('cash','card','transfer','payme','click') NOT NULL,
  status ENUM('pending','paid','cancelled') NOT NULL DEFAULT 'paid',
  note VARCHAR(255),
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES `groups`(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pay_lookup (student_id, group_id, period, status)
);

-- Payme / Click tranzaksiyalari. Bitta to'lov (buyurtma) uchun bir nechta urinish bo'lishi mumkin.
-- state: 1 = yaratilgan, 2 = bajarilgan, -1 = bekor qilingan, -2 = bajarilgandan keyin bekor qilingan
CREATE TABLE payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  provider ENUM('payme','click') NOT NULL,
  provider_trans_id VARCHAR(64) NOT NULL,        -- Payme: id, Click: click_trans_id
  provider_time BIGINT NOT NULL DEFAULT 0,       -- Payme: params.time (ms)
  amount_tiyin BIGINT NOT NULL,
  state TINYINT NOT NULL,
  reason INT NULL,
  create_time BIGINT NOT NULL,                   -- ms
  perform_time BIGINT NOT NULL DEFAULT 0,
  cancel_time BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_provider_tx (provider, provider_trans_id),
  INDEX idx_tx_payment (payment_id, provider, state),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);
