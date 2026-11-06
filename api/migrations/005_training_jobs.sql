-- 005_training_jobs.sql
-- Membuat tabel antrean job pelatihan ulang dengan kunci unik tunggal (T-44)

CREATE TABLE IF NOT EXISTS training_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trigger_type VARCHAR(12) NOT NULL,
    target_data_hash CHAR(64) NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'pending',
    phase VARCHAR(12) NULL,
    progress TINYINT NOT NULL DEFAULT 0,
    started_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    heartbeat_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    running_key TINYINT NULL UNIQUE,
    error_message VARCHAR(255) NULL,
    result_decision VARCHAR(20) NULL,
    result_history_id INT NULL,
    FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (result_history_id) REFERENCES prediction_history(id) ON DELETE SET NULL
);

CREATE INDEX idx_job_status ON training_jobs(status);
CREATE INDEX idx_target_hash ON training_jobs(target_data_hash);
