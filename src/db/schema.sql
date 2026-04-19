-- schema.sql
-- Run this script to create the database and tables needed for GovAid Application.

CREATE DATABASE IF NOT EXISTS GovAid_DB;
USE GovAid_DB;

-- 1. Authorities (Central or Tamil Nadu)
CREATE TABLE IF NOT EXISTS GovernmentAuthority (
    authority_id INT PRIMARY KEY,
    authority_name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Categories (Agriculture, Health, Education, etc.)
CREATE TABLE IF NOT EXISTS Category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE
);

-- 3. Life Events (Birth, Marriage, Retirement, etc.)
CREATE TABLE IF NOT EXISTS LifeEvent (
    life_event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(50) NOT NULL UNIQUE,
    event_description TEXT
);

-- 4. Core Scheme Entity
CREATE TABLE IF NOT EXISTS Scheme (
    scheme_id INT AUTO_INCREMENT PRIMARY KEY,
    scheme_name VARCHAR(200) NOT NULL,
    official_description TEXT,
    simplified_description TEXT,
    authority_id INT NOT NULL,
    launch_year INT,
    tenure VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    CONSTRAINT fk_scheme_authority FOREIGN KEY (authority_id) REFERENCES GovernmentAuthority(authority_id) ON DELETE RESTRICT,
    CONSTRAINT chk_scheme_status CHECK (status IN ('ACTIVE', 'CLOSED', 'UPCOMING'))
);

-- 5. Benefit Types & Amounts (One-to-Many mapping from Scheme)
CREATE TABLE IF NOT EXISTS Benefit (
    benefit_id INT AUTO_INCREMENT PRIMARY KEY,
    scheme_id INT NOT NULL,
    benefit_type VARCHAR(50) NOT NULL,
    benefit_amount DECIMAL(15,2),
    benefit_description VARCHAR(255),
    CONSTRAINT fk_benefit_scheme FOREIGN KEY (scheme_id) REFERENCES Scheme(scheme_id) ON DELETE CASCADE,
    CONSTRAINT chk_benefit_amount CHECK (benefit_amount >= 0)
);

-- 6. Eligibility Criteria for a Scheme (One-to-One mapping)
CREATE TABLE IF NOT EXISTS EligibilityCriteria (
    criteria_id INT AUTO_INCREMENT PRIMARY KEY,
    scheme_id INT NOT NULL UNIQUE,
    min_age INT DEFAULT 0,
    max_age INT DEFAULT 150,
    min_income DECIMAL(15,2) DEFAULT 0.00,
    max_income DECIMAL(15,2),
    required_gender ENUM('ANY', 'MALE', 'FEMALE', 'OTHER') DEFAULT 'ANY',
    required_occupation VARCHAR(100),
    applicable_status VARCHAR(50),
    CONSTRAINT fk_criteria_scheme FOREIGN KEY (scheme_id) REFERENCES Scheme(scheme_id) ON DELETE CASCADE,
    CONSTRAINT chk_age_range CHECK (min_age <= max_age)
);

-- 7. Scheme -> Category (Many-to-Many Bridge Table)
CREATE TABLE IF NOT EXISTS SchemeCategory (
    scheme_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (scheme_id, category_id),
    CONSTRAINT fk_sc_scheme FOREIGN KEY (scheme_id) REFERENCES Scheme(scheme_id) ON DELETE CASCADE,
    CONSTRAINT fk_sc_category FOREIGN KEY (category_id) REFERENCES Category(category_id) ON DELETE CASCADE
);

-- 8. Scheme -> Life Event (Many-to-Many Bridge Table)
CREATE TABLE IF NOT EXISTS SchemeLifeEvent (
    scheme_id INT NOT NULL,
    life_event_id INT NOT NULL,
    PRIMARY KEY (scheme_id, life_event_id),
    CONSTRAINT fk_sle_scheme FOREIGN KEY (scheme_id) REFERENCES Scheme(scheme_id) ON DELETE CASCADE,
    CONSTRAINT fk_sle_event FOREIGN KEY (life_event_id) REFERENCES LifeEvent(life_event_id) ON DELETE CASCADE
);

-- 9. Applications Status Metadata (Submitted, Under Review, Approved, etc)
CREATE TABLE IF NOT EXISTS ApplicationStatus (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE
);

-- 10. Citizen Profiling Table
CREATE TABLE IF NOT EXISTS Citizen (
    citizen_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    aadhaar_number VARCHAR(12) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    annual_income DECIMAL(15,2) NOT NULL,
    occupation VARCHAR(100),
    street VARCHAR(255),
    city VARCHAR(100),
    state_of_residence VARCHAR(50) NOT NULL DEFAULT 'Tamil Nadu',
    pincode VARCHAR(10),
    contact_number VARCHAR(15),
    CONSTRAINT chk_citizen_income CHECK (annual_income >= 0),
    CONSTRAINT chk_aadhaar_length CHECK (CHAR_LENGTH(aadhaar_number) = 12)
);

-- 11. Applications (Citizen Scheme Selection) Map Table
CREATE TABLE IF NOT EXISTS CitizenSchemeSelection (
    selection_id INT AUTO_INCREMENT PRIMARY KEY,
    citizen_id INT NOT NULL,
    scheme_id INT NOT NULL,
    application_date DATE NOT NULL,
    status_id INT NOT NULL,
    remarks TEXT,
    CONSTRAINT fk_css_citizen FOREIGN KEY (citizen_id) REFERENCES Citizen(citizen_id) ON DELETE CASCADE,
    CONSTRAINT fk_css_scheme FOREIGN KEY (scheme_id) REFERENCES Scheme(scheme_id) ON DELETE CASCADE,
    CONSTRAINT fk_css_status FOREIGN KEY (status_id) REFERENCES ApplicationStatus(status_id) ON DELETE RESTRICT,
    CONSTRAINT uc_citizen_scheme UNIQUE (citizen_id, scheme_id)
);

-- =======================================================
-- PERFORMANCE INDEXES
-- =======================================================
CREATE INDEX idx_scheme_authority ON Scheme(authority_id);
CREATE INDEX idx_citizen_city ON Citizen(city);
CREATE INDEX idx_citizen_email ON Citizen(email);
CREATE INDEX idx_css_citizen_id ON CitizenSchemeSelection(citizen_id);
CREATE INDEX idx_css_scheme_id ON CitizenSchemeSelection(scheme_id);
