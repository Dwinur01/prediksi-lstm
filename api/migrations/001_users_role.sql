-- 001_users_role.sql
-- Menambahkan kolom role untuk otorisasi pengguna

ALTER TABLE users 
ADD COLUMN role ENUM('admin', 'staf') NOT NULL DEFAULT 'staf' AFTER password;

