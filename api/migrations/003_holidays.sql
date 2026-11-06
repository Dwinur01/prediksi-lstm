-- 003_holidays.sql
-- Tabel kalender libur nasional & libur sekolah (T-22)

-- Tabel libur nasional/cuti bersama
CREATE TABLE IF NOT EXISTS holidays (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    holiday_date DATE NOT NULL,
    type        ENUM('nasional','cuti_bersama') NOT NULL DEFAULT 'nasional',
    description VARCHAR(150) NOT NULL DEFAULT '',
    UNIQUE KEY uk_holiday_date (holiday_date)
);

-- Tabel libur sekolah (rentang tanggal)
CREATE TABLE IF NOT EXISTS school_holidays (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    description VARCHAR(150) NOT NULL DEFAULT '',
    CONSTRAINT chk_sh_dates CHECK (end_date >= start_date)
);

-- ─────────────────────────────────────────────────────────────
-- Seed: Tanggal Merah & Cuti Bersama 2025 (SKB 3 Menteri 2025)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO holidays (holiday_date, type, description) VALUES
  ('2025-01-01', 'nasional',      'Tahun Baru 2025'),
  ('2025-01-27', 'cuti_bersama', 'Cuti Bersama Isra Miraj'),
  ('2025-01-28', 'nasional',      'Isra Miraj Nabi Muhammad SAW'),
  ('2025-01-29', 'cuti_bersama', 'Cuti Bersama Isra Miraj'),
  ('2025-03-28', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1446 H'),
  ('2025-03-29', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1446 H'),
  ('2025-03-31', 'nasional',      'Idul Fitri 1 Syawal 1446 H'),
  ('2025-04-01', 'nasional',      'Idul Fitri 2 Syawal 1446 H'),
  ('2025-04-02', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1446 H'),
  ('2025-04-03', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1446 H'),
  ('2025-04-04', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1446 H'),
  ('2025-04-07', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1446 H'),
  ('2025-04-18', 'nasional',      'Wafat Isa Al Masih'),
  ('2025-04-20', 'nasional',      'Paskah'),
  ('2025-05-01', 'nasional',      'Hari Buruh Internasional'),
  ('2025-05-12', 'nasional',      'Hari Raya Waisak'),
  ('2025-05-13', 'cuti_bersama', 'Cuti Bersama Waisak'),
  ('2025-05-29', 'nasional',      'Kenaikan Isa Al Masih'),
  ('2025-05-30', 'cuti_bersama', 'Cuti Bersama Kenaikan Isa Al Masih'),
  ('2025-06-01', 'nasional',      'Hari Lahir Pancasila'),
  ('2025-06-06', 'nasional',      'Idul Adha 10 Dzulhijah 1446 H'),
  ('2025-06-09', 'cuti_bersama', 'Cuti Bersama Idul Adha'),
  ('2025-06-27', 'nasional',      'Tahun Baru Islam 1447 H'),
  ('2025-08-17', 'nasional',      'Hari Kemerdekaan Indonesia'),
  ('2025-08-18', 'cuti_bersama', 'Cuti Bersama HUT RI'),
  ('2025-09-05', 'nasional',      'Maulid Nabi Muhammad SAW'),
  ('2025-12-25', 'nasional',      'Hari Raya Natal'),
  ('2025-12-26', 'cuti_bersama', 'Cuti Bersama Natal'),
  -- Seed: 2026 (perkiraan awal, dapat diperbarui via API)
  ('2026-01-01', 'nasional',      'Tahun Baru 2026'),
  ('2026-01-16', 'nasional',      'Isra Miraj Nabi Muhammad SAW 1447 H'),
  ('2026-02-16', 'nasional',      'Tahun Baru Imlek 2577'),
  ('2026-02-17', 'cuti_bersama', 'Cuti Bersama Imlek'),
  ('2026-03-18', 'nasional',      'Hari Raya Nyepi'),
  ('2026-03-19', 'cuti_bersama', 'Cuti Bersama Nyepi'),
  ('2026-03-20', 'nasional',      'Idul Fitri 1 Syawal 1447 H'),
  ('2026-03-21', 'nasional',      'Idul Fitri 2 Syawal 1447 H'),
  ('2026-03-22', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1447 H'),
  ('2026-03-23', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1447 H'),
  ('2026-03-24', 'cuti_bersama', 'Cuti Bersama Idul Fitri 1447 H'),
  ('2026-04-03', 'nasional',      'Wafat Isa Al Masih'),
  ('2026-04-05', 'nasional',      'Paskah');

-- ─────────────────────────────────────────────────────────────
-- Seed: Libur Sekolah 2025–2026 (Kalender Pendidikan Jatim)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO school_holidays (start_date, end_date, description) VALUES
  ('2025-07-01', '2025-07-12', 'Libur kenaikan kelas 2025 (Jatim)'),
  ('2025-12-22', '2026-01-03', 'Libur akhir semester ganjil 2025/2026 (Jatim)'),
  ('2026-03-20', '2026-03-28', 'Libur Idul Fitri 1447 H (Jatim)');
