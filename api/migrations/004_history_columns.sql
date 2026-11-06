-- 004_history_columns.sql
-- Menambahkan kolom jejak data, model aktif, dan konfigurasi ke prediction_history (T-40)

ALTER TABLE prediction_history
ADD COLUMN model_mode VARCHAR(20) DEFAULT 'latih' AFTER run_date,
ADD COLUMN config_json JSON NULL AFTER window_size,
ADD COLUMN data_n INT NULL AFTER config_json,
ADD COLUMN data_first_week DATE NULL AFTER data_n,
ADD COLUMN data_last_week DATE NULL AFTER data_first_week,
ADD COLUMN data_hash CHAR(64) NULL AFTER data_last_week,
ADD COLUMN is_active TINYINT(1) DEFAULT 0 AFTER data_hash,
ADD COLUMN job_id INT NULL AFTER is_active,
ADD COLUMN variant VARCHAR(12) NULL AFTER job_id,
ADD COLUMN decision VARCHAR(20) NULL AFTER variant;

CREATE INDEX idx_is_active ON prediction_history(is_active);
CREATE INDEX idx_data_hash ON prediction_history(data_hash);
