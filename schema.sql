-- ============================================================
-- Smart Blood Donation Management System
-- MySQL Database Schema
-- ============================================================
-- Run this file to create the full database and all tables.
-- Usage: mysql -u root -p < schema.sql
-- ============================================================

DROP DATABASE IF EXISTS blood_donation_db;
CREATE DATABASE blood_donation_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE blood_donation_db;

-- ============================================================
-- 1. USERS TABLE (core auth table for all roles)
-- ============================================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('admin', 'donor', 'patient', 'hospital') NOT NULL DEFAULT 'donor',
    profile_photo VARCHAR(255) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    state VARCHAR(100) DEFAULT NULL,
    pincode VARCHAR(10) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_city (city)
) ENGINE=InnoDB;

-- ============================================================
-- 2. HOSPITALS TABLE
-- ============================================================
CREATE TABLE hospitals (
    hospital_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    hospital_name VARCHAR(150) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    hospital_type ENUM('government', 'private', 'trust') DEFAULT 'private',
    contact_person VARCHAR(100) DEFAULT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) DEFAULT NULL,
    latitude DECIMAL(10,8) DEFAULT NULL,
    longitude DECIMAL(11,8) DEFAULT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_hospitals_city (city)
) ENGINE=InnoDB;

-- ============================================================
-- 3. BLOOD BANKS TABLE
-- ============================================================
CREATE TABLE blood_banks (
    blood_bank_id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT DEFAULT NULL,
    bank_name VARCHAR(150) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(150) DEFAULT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) DEFAULT NULL,
    operating_hours VARCHAR(100) DEFAULT '9:00 AM - 6:00 PM',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
    INDEX idx_bloodbanks_city (city)
) ENGINE=InnoDB;

-- ============================================================
-- 4. DONORS TABLE
-- ============================================================
CREATE TABLE donors (
    donor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    weight DECIMAL(5,2) DEFAULT NULL,
    last_donation_date DATE DEFAULT NULL,
    total_donations INT DEFAULT 0,
    availability_status ENUM('available', 'unavailable') DEFAULT 'available',
    medical_conditions TEXT DEFAULT NULL,
    is_eligible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_donors_blood_group (blood_group),
    INDEX idx_donors_availability (availability_status)
) ENGINE=InnoDB;

-- ============================================================
-- 5. PATIENTS TABLE
-- ============================================================
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    blood_group_needed ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    date_of_birth DATE DEFAULT NULL,
    gender ENUM('male', 'female', 'other') DEFAULT NULL,
    medical_condition VARCHAR(255) DEFAULT NULL,
    attending_hospital_id INT DEFAULT NULL,
    emergency_contact VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (attending_hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
    INDEX idx_patients_blood_group (blood_group_needed)
) ENGINE=InnoDB;

-- ============================================================
-- 6. BLOOD STOCK TABLE
-- ============================================================
CREATE TABLE blood_stock (
    stock_id INT AUTO_INCREMENT PRIMARY KEY,
    blood_bank_id INT NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    units_available INT NOT NULL DEFAULT 0,
    units_reserved INT NOT NULL DEFAULT 0,
    expiry_date DATE DEFAULT NULL,
    last_restocked DATE DEFAULT NULL,
    minimum_threshold INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(blood_bank_id) ON DELETE CASCADE,
    UNIQUE KEY uniq_bank_group (blood_bank_id, blood_group),
    INDEX idx_stock_blood_group (blood_group)
) ENGINE=InnoDB;

-- ============================================================
-- 7. BLOOD REQUESTS TABLE
-- ============================================================
CREATE TABLE blood_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    donor_id INT DEFAULT NULL,
    hospital_id INT DEFAULT NULL,
    blood_bank_id INT DEFAULT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    units_required INT NOT NULL DEFAULT 1,
    urgency ENUM('normal', 'urgent', 'emergency') DEFAULT 'normal',
    status ENUM('pending', 'accepted', 'rejected', 'in_progress', 'fulfilled', 'cancelled') DEFAULT 'pending',
    required_by_date DATE DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    hospital_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE SET NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
    FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(blood_bank_id) ON DELETE SET NULL,
    INDEX idx_requests_status (status),
    INDEX idx_requests_urgency (urgency),
    INDEX idx_requests_blood_group (blood_group)
) ENGINE=InnoDB;

-- ============================================================
-- 8. DONATION HISTORY TABLE
-- ============================================================
CREATE TABLE donation_history (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    request_id INT DEFAULT NULL,
    blood_bank_id INT DEFAULT NULL,
    hospital_id INT DEFAULT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    units_donated INT NOT NULL DEFAULT 1,
    donation_date DATE NOT NULL,
    certificate_number VARCHAR(50) DEFAULT NULL UNIQUE,
    certificate_url VARCHAR(255) DEFAULT NULL,
    status ENUM('completed', 'cancelled') DEFAULT 'completed',
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES blood_requests(request_id) ON DELETE SET NULL,
    FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(blood_bank_id) ON DELETE SET NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
    INDEX idx_donation_date (donation_date)
) ENGINE=InnoDB;

-- ============================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'emergency') DEFAULT 'info',
    related_request_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_request_id) REFERENCES blood_requests(request_id) ON DELETE SET NULL,
    INDEX idx_notifications_user (user_id, is_read)
) ENGINE=InnoDB;

-- ============================================================
-- 10. ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    details TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_logs_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 11. REPORTS TABLE
-- ============================================================
CREATE TABLE reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    generated_by INT NOT NULL,
    report_type ENUM('donors', 'patients', 'requests', 'stock', 'donations', 'custom') NOT NULL,
    report_name VARCHAR(150) NOT NULL,
    file_path VARCHAR(255) DEFAULT NULL,
    filters_applied TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA: Default Admin Account
-- Password = "Admin@123" (bcrypt hash, generated with 10 salt rounds)
-- ============================================================
INSERT INTO users (full_name, email, password, phone, role, is_verified)
VALUES (
    'System Administrator',
    'admin@blooddonation.com',
    '$2b$10$4nAd7q1jN0mFqXKp5xkVaOeYdKcXybYw5t3wKzYc6.pQwZlS0Zzn6',
    '9999999999',
    'admin',
    TRUE
);

-- ============================================================
-- SEED DATA: Sample Blood Bank
-- ============================================================
INSERT INTO blood_banks (bank_name, license_number, contact_number, email, address, city, state, pincode)
VALUES ('City Central Blood Bank', 'BB-2024-001', '9876543210', 'contact@citybloodbank.com', '123 Main Street', 'Mumbai', 'Maharashtra', '400001');

INSERT INTO blood_stock (blood_bank_id, blood_group, units_available, minimum_threshold)
VALUES
(1, 'A+', 25, 10), (1, 'A-', 8, 10), (1, 'B+', 30, 10), (1, 'B-', 5, 10),
(1, 'AB+', 15, 10), (1, 'AB-', 4, 10), (1, 'O+', 40, 10), (1, 'O-', 12, 10);
