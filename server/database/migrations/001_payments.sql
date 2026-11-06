-- Eski bazani (to'lov tizimisiz) yangilash uchun. Yangi o'rnatishda kerak emas:
-- `npm run db:setup` schema.sql ichidagi tayyor jadvallarni yaratadi (mavjud ma'lumotlarni o'chiradi!).
--
-- Ishlatish:  mysql -u root -p oquv_markaz < database/migrations/001_payments.sql
-- Faqat BIR MARTA bajaring.
USE oquv_markaz;

ALTER TABLE `groups` ADD COLUMN price INT NOT NULL DEFAULT 0 AFTER schedule;

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  group_id INT NOT NULL,
  period CHAR(7) NOT NULL,
  amount INT NOT NULL CHECK (amount > 0),
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

CREATE TABLE payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  provider ENUM('payme','click') NOT NULL,
  provider_trans_id VARCHAR(64) NOT NULL,
  provider_time BIGINT NOT NULL DEFAULT 0,
  amount_tiyin BIGINT NOT NULL,
  state TINYINT NOT NULL,
  reason INT NULL,
  create_time BIGINT NOT NULL,
  perform_time BIGINT NOT NULL DEFAULT 0,
  cancel_time BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_provider_tx (provider, provider_trans_id),
  INDEX idx_tx_payment (payment_id, provider, state),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);
