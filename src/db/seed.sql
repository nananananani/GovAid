-- seed.sql
-- Initializes the GovAid Database for the college project demonstration.

USE GovAid_DB;

-- =======================================================
-- 1. SAFE TRUNCATE (Clears old data safely)
-- =======================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE CitizenSchemeSelection;
TRUNCATE TABLE SchemeCategory;
TRUNCATE TABLE SchemeLifeEvent;
TRUNCATE TABLE Benefit;
TRUNCATE TABLE EligibilityCriteria;
TRUNCATE TABLE Citizen;
TRUNCATE TABLE Scheme;
TRUNCATE TABLE ApplicationStatus;
TRUNCATE TABLE Category;
TRUNCATE TABLE LifeEvent;
TRUNCATE TABLE GovernmentAuthority;
SET FOREIGN_KEY_CHECKS = 1;

-- =======================================================
-- 2. LOOKUP DATA INSERTS
-- =======================================================

-- Authority
INSERT INTO GovernmentAuthority (authority_id, authority_name) VALUES 
(1, 'Central Government'),
(2, 'Tamil Nadu State Government');

-- Application Statuses
INSERT INTO ApplicationStatus (status_id, status_name) VALUES 
(1, 'Submitted'),
(2, 'Under Review'),
(3, 'Pending Doc Verification'),
(4, 'Approved'),
(5, 'Rejected'),
(6, 'Disbursed');

-- Categories (Using IDs 1 to 9)
INSERT INTO Category (category_id, category_name) VALUES 
(1, 'Student'), (2, 'Women'), (3, 'Farmer'), (4, 'Senior Citizen'), 
(5, 'Health'), (6, 'Housing'), (7, 'Employment'), (8, 'Education'), (9, 'Finance');

-- Life Events (Using IDs 1 to 8)
INSERT INTO LifeEvent (life_event_id, event_name, event_description) VALUES 
(1, 'Turning 18', 'Transitioning to adulthood.'),
(2, 'Turning 60', 'Reaching retirement or senior age.'),
(3, 'Marriage', 'Entering a marital union.'),
(4, 'Girl Child', 'Birth or rearing of a female child.'),
(5, 'Buying House', 'Purchasing or constructing a first home.'),
(6, 'Becoming Farmer', 'Engaging in agricultural activities.'),
(7, 'Pregnancy', 'Expecting a newborn.'),
(8, 'Disability Support', 'Facing physical or mental health challenges.');

-- =======================================================
-- 3. CENTRAL GOVERNMENT SCHEMES (10 Schemes)
-- =======================================================
INSERT INTO Scheme (scheme_id, scheme_name, official_description, simplified_description, authority_id, launch_year, tenure, status) VALUES 
(1, 'PM-KISAN', 'Income support of Rs. 6000 per year for farmer families.', 'Cash support for farmers.', 1, 2019, 'Annual', 'ACTIVE'),
(2, 'PMAY-Urban', 'Affordable housing for all by providing housing for the urban poor.', 'Subsidies for buying a house.', 1, 2015, 'One-Time', 'ACTIVE'),
(3, 'Ayushman Bharat', 'National health insurance fund aiming to provide free access to healthcare.', 'Free medical insurance cover.', 1, 2018, 'Annual', 'ACTIVE'),
(4, 'Sukanya Samriddhi Yojana', 'Savings scheme targeted at the parents of girl children.', 'High interest savings for daughters.', 1, 2015, 'One-Time', 'ACTIVE'),
(5, 'Atal Pension Yojana', 'Pension scheme primarily targeting the unorganised sector.', 'Guaranteed pension after age 60.', 1, 2015, 'Lifetime', 'ACTIVE'),
(6, 'PM Mudra Yojana', 'Loans up to 10 lakhs to the non-corporate, non-farm small/micro enterprises.', 'Small business loans.', 1, 2015, 'Flexible', 'ACTIVE'),
(7, 'Stand Up India', 'Promoting grassroots entrepreneurship among SC, ST and women.', 'Bank loans to marginalized entrepreneurs.', 1, 2016, 'Flexible', 'ACTIVE'),
(8, 'PM Matru Vandana Yojana', 'Maternity benefit program implemented across all districts.', 'Cash incentive for pregnant women.', 1, 2017, 'One-Time', 'ACTIVE'),
(9, 'Skill India Mission', 'Enables youth to take up industry-relevant skill training.', 'Free vocational job training.', 1, 2015, 'Seasonal', 'ACTIVE'),
(10, 'Digital India Platform', 'Ensures Government services are available electronically.', 'Digital literacy and infra access.', 1, 2015, 'Lifetime', 'ACTIVE');

-- =======================================================
-- 4. TAMIL NADU GOVERNMENT SCHEMES (10 Schemes)
-- =======================================================
INSERT INTO Scheme (scheme_id, scheme_name, official_description, simplified_description, authority_id, launch_year, tenure, status) VALUES 
(11, 'Kalaignar Magalir Urimai Thittam', 'Provides Rs. 1000 per month as basic income to eligible women heads of families.', 'Monthly Rs. 1000 for women.', 2, 2023, 'Monthly', 'ACTIVE'),
(12, 'Pudhumai Penn Scheme', 'Financial assistance of Rs. 1000/month to girl students for higher education.', 'Rs.1000 monthly for college girls.', 2, 2022, 'Monthly', 'ACTIVE'),
(13, 'Makkalai Thedi Maruthuvam', 'Delivering healthcare to the doorstep including screening of NCDs.', 'Doorstep healthcare and medicines.', 2, 2021, 'Lifetime', 'ACTIVE'),
(14, 'Illam Thedi Kalvi', 'Doorstep education scheme to bridge learning gaps caused by the pandemic.', 'After-school tutoring for kids.', 2, 2021, 'Seasonal', 'ACTIVE'),
(15, 'Uzhavar Sandhai', 'Farmers markets allowing farmers to sell directly to consumers.', 'Direct farmers market access.', 2, 1999, 'Lifetime', 'ACTIVE'),
(16, 'Moovalur Ramamirtham Ammaiyar Scheme', 'Marriage assistance later restructured to provide higher education assistance.', 'Higher education funding.', 2, 1989, 'One-Time', 'CLOSED'),
(17, 'Amma Two Wheeler Scheme', '50% subsidy for working women to buy automated scooters.', 'Subsidized scooters for working women.', 2, 2018, 'One-Time', 'CLOSED'),
(18, 'Chief Minister Comprehensive Health Insurance', 'State health insurance covering varying surgical treatments.', 'Free TN medical insurance.', 2, 2009, 'Annual', 'ACTIVE'),
(19, 'Dr. Muthulakshmi Reddy Maternity Scheme', 'Financial assistance up to Rs. 18,000 to pregnant women.', 'Pregnancy cash support in TN.', 2, 2006, 'One-Time', 'ACTIVE'),
(20, 'Naan Mudhalvan', 'Skill enhancement and career guidance program for students.', 'Career prep for TN youth.', 2, 2022, 'Annual', 'ACTIVE');

-- =======================================================
-- 5. DEPENDENT SCHEME RECORDS (Benefits, Criteria, Bridge Tables)
-- =======================================================

-- Benefits
INSERT INTO Benefit (scheme_id, benefit_type, benefit_amount, benefit_description) VALUES
(1, 'Cash Transfer', 6000.00, 'Deposited annually to bank account'),
(2, 'Subsidy', 250000.00, 'Interest subsidy on home loans'),
(3, 'Health Cover', 500000.00, 'Free health coverage per family per year'),
(4, 'Interest Rate', 0.00, 'Premium compounded interest on deposits'),
(5, 'Pension', 5000.00, 'Fixed monthly pension amount after 60'),
(8, 'Cash Transfer', 5000.00, 'Paid in three installments'),
(11, 'Cash Transfer', 1000.00, 'Monthly cash to women family heads'),
(12, 'Cash Transfer', 1000.00, 'Direct transfer to college pursuing girls bank account'),
(18, 'Health Cover', 500000.00, 'Hospitalization coverage in impanelled hospitals'),
(19, 'Maternity Cash', 18000.00, 'Maternity cash distribution'),
(17, 'Vehicle Subsidy', 25000.00, 'Maximum subsidy limit applied to invoice');

-- EligibilityCriteria
INSERT INTO EligibilityCriteria (scheme_id, min_age, max_age, min_income, max_income, required_gender, required_occupation, applicable_status) VALUES
(1, 18, 150, 0, NULL, 'ANY', 'Farmer', NULL),        -- PM-KISAN
(3, 0, 150, 0, 500000, 'ANY', NULL, NULL),            -- Ayushman Bharat
(4, 0, 10, 0, NULL, 'FEMALE', NULL, NULL),            -- Sukanya Samriddhi
(5, 18, 40, 0, NULL, 'ANY', 'Unorganised', NULL),     -- Atal Pension
(8, 18, 150, 0, NULL, 'FEMALE', NULL, 'Pregnant'),    -- PM Matru
(11, 21, 150, 0, 250000, 'FEMALE', NULL, 'Head of Family'), -- Magalir Urimai
(12, 16, 25, 0, NULL, 'FEMALE', 'Student', NULL),     -- Pudhumai Penn
(17, 18, 40, 0, 250000, 'FEMALE', 'Employed', NULL),  -- Two Wheeler
(18, 0, 150, 0, 120000, 'ANY', NULL, NULL),           -- TN Health
(19, 18, 150, 0, NULL, 'FEMALE', NULL, 'Pregnant');   -- Muthulakshmi Reddy

-- SchemeCategory (Bridge Table associations)
INSERT INTO SchemeCategory (scheme_id, category_id) VALUES
(1, 3), (1, 9),      -- PM-KISAN: Farmer, Finance
(2, 6),              -- PMAY: Housing
(3, 5),              -- Ayushman: Health
(4, 2), (4, 9),      -- Sukanya: Women, Finance
(5, 4), (5, 9),      -- Atal Pension: Senior Citizen, Finance
(8, 2), (8, 5),      -- PM Matru: Women, Health
(11, 2), (11, 9),    -- Magalir Urimai: Women, Finance
(12, 1), (12, 2), (12, 8), -- Pudhumai Penn: Student, Women, Education
(18, 5),             -- CM Health: Health
(19, 2), (19, 5);    -- Muthulakshmi: Women, Health

-- SchemeLifeEvent (Bridge Table associations)
INSERT INTO SchemeLifeEvent (scheme_id, life_event_id) VALUES
(1, 6),              -- PM-KISAN : Becoming Farmer
(2, 5),              -- PMAY : Buying House
(4, 4),              -- Sukanya : Girl Child
(5, 2),              -- Atal Pension : Turning 60
(8, 7),              -- PM Matru : Pregnancy
(12, 1),             -- Pudhumai Penn : Turning 18
(19, 7);             -- Muthulakshmi : Pregnancy

-- =======================================================
-- 6. SAMPLE CITIZENS (5 Citizens)
-- =======================================================
-- Password hash: 'hash_pw' used as mockup representation for auth testing.
INSERT INTO Citizen (citizen_id, email, password_hash, aadhaar_number, first_name, last_name, date_of_birth, gender, annual_income, occupation, street, city, state_of_residence, pincode, contact_number) VALUES
(1, 'ramesh@email.com', 'hash_pw_mock_1', '123456789012', 'Ramesh', 'Kumar', '1980-05-12', 'MALE', 150000, 'Farmer', '12 Gandhi Rd', 'Madurai', 'Tamil Nadu', '625001', '9876543210'),
(2, 'priya@email.com', 'hash_pw_mock_2', '987654321098', 'Priya', 'Sundar', '1995-11-20', 'FEMALE', 300000, 'IT Employee', '8 Anna St', 'Chennai', 'Tamil Nadu', '600001', '9123456789'),
(3, 'meena@email.com', 'hash_pw_mock_3', '555566667777', 'Meena', 'Raman', '1975-02-15', 'FEMALE', 90000, 'Vendor', '10 Nehru Nagar', 'Trichy', 'Tamil Nadu', '620001', '9998887776'),
(4, 'vijay@email.com', 'hash_pw_mock_4', '111122223333', 'Vijay', 'Krishna', '2004-06-30', 'MALE', 50000, 'Student', '44 Kamaraj Ave', 'Coimbatore', 'Tamil Nadu', '641001', '8887776665'),
(5, 'lakshmi@email.com', 'hash_pw_mock_5', '444455556666', 'Lakshmi', 'Iyer', '1958-12-05', 'FEMALE', 100000, 'Retired', '1 Temple Rd', 'Thanjavur', 'Tamil Nadu', '613001', '7776665554');

-- =======================================================
-- 7. SAMPLE APPLICATIONS 
-- =======================================================
-- Mapped to explicit ApplicationStatus ID: 1=Submitted, 2=Under Review, ..., 6=Disbursed, etc.
INSERT INTO CitizenSchemeSelection (citizen_id, scheme_id, application_date, status_id, remarks) VALUES
(1, 1, '2023-01-15', 6, 'Amount directly credited to farmer account.'),
(2, 2, '2023-05-10', 4, 'Housing loan application cleared by bank.'),
(3, 11, '2023-09-01', 6, 'Monthly 1000 rs active.'),
(3, 3, '2023-10-12', 4, 'Health card issued.'),
(4, 20, '2023-11-20', 2, 'Awaiting skill training batch allotment.'),
(5, 5, '2022-03-10', 6, 'Pension is ongoing.');
