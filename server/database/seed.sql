-- Namunaviy ma'lumotlar.
-- DIQQAT: bu fayl @pw o'zgaruvchisini (bcrypt hash) kutadi. Uni `npm run db:setup`
-- o'zi o'rnatadi (parol: Parol123). Qo'lda yuklash uchun README'ga qarang.
USE oquv_markaz;

-- Admin (id=1) va ustozlar (id=2,3)
INSERT INTO users (id, full_name, email, password, role, phone) VALUES
(1, 'Admin',            'admin@markaz.uz',   @pw, 'admin',   '+998900000000'),
(2, 'Odil Qodirov',     'odil@markaz.uz',    @pw, 'teacher', '+998911111111'),
(3, 'Nargiza Saidova',  'nargiza@markaz.uz', @pw, 'teacher', '+998922222222');

-- Fanlar
INSERT INTO subjects (id, name, description) VALUES
(1, 'Matematika',  'Algebra va geometriya'),
(2, 'Ingliz tili', 'General English'),
(3, 'Dasturlash',  'Python asoslari');

INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (2,1), (2,3), (3,2);

-- Guruhlar (price — oylik to'lov, so'mda)
INSERT INTO `groups` (id, name, subject_id, teacher_id, schedule, price) VALUES
(1, 'Matematika-A', 1, 2, 'Du-Chor-Ju 14:00',   300000),
(2, 'English-B',    2, 3, 'Sesh-Pay-Sha 16:00', 250000);

-- Talabalar (id=4..11)
INSERT INTO users (id, full_name, email, password, role, phone) VALUES
(4,  'Azizbek Karimov',    'azizbek@markaz.uz',  @pw, 'student', '+998901112233'),
(5,  'Madina Rahimova',    'madina@markaz.uz',   @pw, 'student', '+998902223344'),
(6,  'Jasur Toshmatov',    'jasur@markaz.uz',    @pw, 'student', '+998903334455'),
(7,  'Dilnoza Yusupova',   'dilnoza@markaz.uz',  @pw, 'student', '+998904445566'),
(8,  'Sardor Aliyev',      'sardor@markaz.uz',   @pw, 'student', '+998905556677'),
(9,  'Malika Abdullayeva', 'malika@markaz.uz',   @pw, 'student', '+998906667788'),
(10, 'Bobur Nazarov',      'bobur@markaz.uz',    @pw, 'student', '+998907778899'),
(11, 'Shahzoda Ergasheva', 'shahzoda@markaz.uz', @pw, 'student', '+998908889900');

INSERT INTO group_students (group_id, student_id) VALUES
(1,4), (1,5), (1,6), (1,7),
(2,8), (2,9), (2,10), (2,11);

-- Baholash mezoni. Matematika va Ingliz tili e'lon qilingan (jami 100 ball),
-- Dasturlash hali qoralama (70 ball taqsimlangan, e'lon qilib bo'lmaydi).
INSERT INTO grading_schemes (id, subject_id, description, status, published_at) VALUES
(1, 1, '100 ballik tizim: joriy nazorat 50 ball, imtihonlar 50 ball', 'published', '2026-09-01 09:00:00'),
(2, 2, 'Til ko''nikmalari va yakuniy imtihon',                          'published', '2026-09-01 09:00:00'),
(3, 3, 'Qoralama: hali to''liq taqsimlanmagan',                        'draft',     NULL);

INSERT INTO grading_components (id, scheme_id, name, max_score, is_exam, sort_order) VALUES
(1,  1, 'Dars faolligi',          15, 0, 1),
(2,  1, 'Uy vazifalari',          15, 0, 2),
(3,  1, 'Testlar',                20, 0, 3),
(4,  1, 'Oraliq imtihon',         20, 1, 4),
(5,  1, 'Yakuniy imtihon',        30, 1, 5),
(6,  2, 'Speaking',               25, 0, 1),
(7,  2, 'Writing',                25, 0, 2),
(8,  2, 'Listening',              20, 0, 3),
(9,  2, 'Yakuniy imtihon',        30, 1, 4),
(10, 3, 'Amaliy mashg''ulotlar',  40, 0, 1),
(11, 3, 'Loyiha',                 30, 0, 2);

-- Namunaviy baholar (ball komponentning maksimumidan oshmaydi)
INSERT INTO grades (student_id, group_id, teacher_id, component_id, score, comment, date) VALUES
(4,  1, 2, 3, 18, 'Yaxshi',               '2026-10-20'),
(5,  1, 2, 2, 13, NULL,                   '2026-10-21'),
(6,  1, 2, 1, 10, 'Faolroq bo''ling',     '2026-10-22'),
(7,  1, 2, 1, 12, NULL,                   '2026-10-22'),
(4,  1, 2, 4, 19, 'Ajoyib natija',        '2026-10-27'),
(5,  1, 2, 3, 16, NULL,                   '2026-10-27'),
(8,  2, 3, 9, 28, 'A''lo',                '2026-10-25'),
(9,  2, 3, 8, 17, NULL,                   '2026-10-26'),
(10, 2, 3, 7, 15, 'Topshirish kechikdi',  '2026-10-28'),
(11, 2, 3, 6, 23, NULL,                   '2026-10-29');

-- Namunaviy davomat
INSERT INTO attendance (group_id, student_id, date, status) VALUES
(1,4,'2026-10-27','present'), (1,5,'2026-10-27','present'),
(1,6,'2026-10-27','absent'),  (1,7,'2026-10-27','present'),
(1,4,'2026-10-29','present'), (1,5,'2026-10-29','absent'),
(1,6,'2026-10-29','present'), (1,7,'2026-10-29','present'),
(2,8,'2026-10-28','present'), (2,9,'2026-10-28','present'),
(2,10,'2026-10-28','absent'), (2,11,'2026-10-28','present');

-- Namunaviy to'lovlar (so'mda). Azizbek va Sardor 2026-11 uchun to'liq, Madina qisman to'lagan.
INSERT INTO payments (student_id, group_id, period, amount, method, status, note, created_by, created_at, paid_at) VALUES
(4, 1, '2026-10', 300000, 'cash',     'paid', NULL,               1, '2026-10-03 10:00:00', '2026-10-03 10:00:00'),
(5, 1, '2026-10', 300000, 'card',     'paid', NULL,               1, '2026-10-04 11:30:00', '2026-10-04 11:30:00'),
(8, 2, '2026-10', 250000, 'transfer', 'paid', 'Bank o''tkazmasi', 1, '2026-10-05 09:15:00', '2026-10-05 09:15:00'),
(4, 1, '2026-11', 300000, 'cash',     'paid', NULL,               1, '2026-11-02 10:00:00', '2026-11-02 10:00:00'),
(5, 1, '2026-11', 150000, 'card',     'paid', 'Qisman to''lov',   1, '2026-11-03 12:00:00', '2026-11-03 12:00:00'),
(8, 2, '2026-11', 250000, 'cash',     'paid', NULL,               1, '2026-11-02 15:00:00', '2026-11-02 15:00:00');
