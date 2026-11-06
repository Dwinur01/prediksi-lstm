CREATE DATABASE IF NOT EXISTS prediksi_lstm;
USE prediksi_lstm;

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staf') NOT NULL DEFAULT 'staf',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Penjualan Tiket
CREATE TABLE IF NOT EXISTS ticket_sales (
    id VARCHAR(50) PRIMARY KEY,
    week_start_date DATE NOT NULL,
    sale_date DATE NULL,
    week INT NOT NULL,
    year INT NOT NULL,
    tickets_sold INT NOT NULL,
    ticket_price FLOAT DEFAULT 0,
    libur TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_week_start_date (week_start_date)
);

-- 3. Tabel Riwayat Prediksi
CREATE TABLE IF NOT EXISTS prediction_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    model_mode VARCHAR(20) DEFAULT 'latih',
    run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    epochs INT,
    learning_rate FLOAT,
    window_size INT,
    config_json JSON NULL,
    data_n INT NULL,
    data_first_week DATE NULL,
    data_last_week DATE NULL,
    data_hash CHAR(64) NULL,
    is_active TINYINT(1) DEFAULT 0,
    job_id INT NULL,
    variant VARCHAR(12) NULL,
    decision VARCHAR(20) NULL,
    mse FLOAT,
    rmse FLOAT,
    mape FLOAT,
    mae FLOAT NULL,
    results_json LONGTEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Tabel Bobot Model LSTM
CREATE TABLE IF NOT EXISTS lstm_weights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    history_id INT NOT NULL,
    weights_json LONGTEXT,
    FOREIGN KEY (history_id) REFERENCES prediction_history(id) ON DELETE CASCADE
);

-- 5. Tabel Percobaan Login (Rate Limiting)
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    username VARCHAR(50) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_user_time (ip_address, username, attempted_at)
);

-- 6. Tabel Antrean Job Pelatihan Ulang (T-44)
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

-- 7. Tabel Kalender Libur Nasional (T-22)
CREATE TABLE IF NOT EXISTS holidays (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    holiday_date DATE NOT NULL,
    type         ENUM('nasional','cuti_bersama') NOT NULL DEFAULT 'nasional',
    description  VARCHAR(150) NOT NULL DEFAULT '',
    UNIQUE KEY uk_holiday_date (holiday_date)
);

-- 8. Tabel Libur Sekolah — Rentang Tanggal (T-22)
CREATE TABLE IF NOT EXISTS school_holidays (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    description VARCHAR(150) NOT NULL DEFAULT '',
    CONSTRAINT chk_sh_dates CHECK (end_date >= start_date)
);

-- Indexes for performance
CREATE INDEX idx_year_week ON ticket_sales(year, week);
CREATE INDEX idx_week_start_date ON ticket_sales(week_start_date);
CREATE INDEX idx_is_active ON prediction_history(is_active);
CREATE INDEX idx_data_hash ON prediction_history(data_hash);
CREATE INDEX idx_job_status ON training_jobs(status);
CREATE INDEX idx_target_hash ON training_jobs(target_data_hash);
