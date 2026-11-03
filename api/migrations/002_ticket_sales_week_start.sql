-- 002_ticket_sales_week_start.sql
-- Menambahkan kolom week_start_date, libur, dan updated_at
-- Memigrasikan data dari sale_date ke week_start_date dan memperbarui constraint unik

ALTER TABLE ticket_sales
ADD COLUMN week_start_date DATE NULL AFTER id,
ADD COLUMN libur TINYINT(1) NOT NULL DEFAULT 0 AFTER ticket_price,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER libur;

-- Migrasikan data yang sudah ada dari sale_date
UPDATE ticket_sales 
SET week_start_date = sale_date 
WHERE week_start_date IS NULL AND sale_date IS NOT NULL;

-- Ubah week_start_date menjadi NOT NULL setelah data termigrasi
ALTER TABLE ticket_sales 
MODIFY COLUMN week_start_date DATE NOT NULL;

-- Ganti constraint UNIQUE(week, year) dengan UNIQUE(week_start_date)
ALTER TABLE ticket_sales 
DROP INDEX week_year;

ALTER TABLE ticket_sales 
ADD UNIQUE KEY uk_week_start_date (week_start_date);

