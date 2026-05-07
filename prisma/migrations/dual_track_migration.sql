-- =============================================================
-- DUAL-TRACK INTERNSHIP SYSTEM — DATABASE MIGRATION
-- Run this file directly against the PFE_esst database
-- IMPORTANT: Back up the database before running!
-- =============================================================

-- 1. Add student_level type to enums (MySQL adds via MODIFY COLUMN on each table)

-- 2. Add level + department to User
ALTER TABLE user
  ADD COLUMN level ENUM('L1','L2','L3','M1','M2') NULL AFTER role,
  ADD COLUMN department VARCHAR(100) NULL AFTER level;

-- 3. Add level to StudentProfile
ALTER TABLE studentprofile
  ADD COLUMN level ENUM('L1','L2','L3','M1','M2') NULL;

-- 4. Add level to RegistrationRequest
ALTER TABLE registrationrequest
  ADD COLUMN level ENUM('L1','L2','L3','M1','M2') NULL AFTER promotion;

-- 5. Add internshipType + student-proposal fields to Topic
ALTER TABLE topic
  ADD COLUMN internshipType ENUM('PFE','NORMAL') NULL AFTER type,
  ADD COLUMN proposedByStudent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN directAssigneeId VARCHAR(191) NULL,
  ADD COLUMN companyName VARCHAR(150) NULL,
  ADD COLUMN companySector VARCHAR(100) NULL,
  ADD COLUMN companyAddress VARCHAR(200) NULL,
  ADD COLUMN companyCity VARCHAR(100) NULL,
  ADD COLUMN contactPerson VARCHAR(100) NULL,
  ADD COLUMN contactEmail VARCHAR(150) NULL,
  ADD COLUMN contactPhone VARCHAR(30) NULL,
  ADD COLUMN supportingDocUrl VARCHAR(300) NULL;

-- 6. Extend internship_status enum (preserves existing rows)
ALTER TABLE internship MODIFY COLUMN status
  ENUM('REQUESTED','DOCUMENT_SENT','IN_PROGRESS','NEEDS_REVISION','APPROVED','FINAL_REPORT_SUBMITTED','PENDING_ADMIN_CONFIRMATION','COMPLETED','CANCELLED')
  NOT NULL DEFAULT 'REQUESTED';

-- 7. Add new columns to Internship (including 3-gate validation flags)
ALTER TABLE internship
  ADD COLUMN internshipType ENUM('PFE','NORMAL') NULL AFTER academicYear,
  ADD COLUMN midtermDeadline DATE NULL,
  ADD COLUMN finalDeadline DATE NULL,
  ADD COLUMN technicalSupervisorName VARCHAR(100) NULL,
  ADD COLUMN technicalSupervisorEmail VARCHAR(150) NULL,
  ADD COLUMN activatedAt DATETIME NULL,
  ADD COLUMN completedAt DATETIME NULL,
  ADD COLUMN teacherValidatedFinalReport BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN teacherValidatedAt DATETIME NULL,
  ADD COLUMN companyValidatedFinalReport BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN companyValidatedAt DATETIME NULL;

-- 8. Add isBinome to StudentApplication
ALTER TABLE studentapplication
  ADD COLUMN isBinome BOOLEAN NOT NULL DEFAULT FALSE;

-- 9. Extend BinomeInvitation with message + respondedAt
ALTER TABLE binomeinvitation
  ADD COLUMN message TEXT NULL,
  ADD COLUMN respondedAt DATETIME NULL;

-- 10. Add advisory review flags to Document
ALTER TABLE document
  ADD COLUMN approvedByTeacher BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN approvedByCompany BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN reviewedByCompany VARCHAR(191) NULL,
  ADD COLUMN companyComment TEXT NULL;

-- 11. Add link to Notification
ALTER TABLE notification
  ADD COLUMN link VARCHAR(300) NULL;

-- 12. Extend notification_type enum (adds dual-track types)
ALTER TABLE notification MODIFY COLUMN type
  ENUM(
    'REGISTRATION_SUBMITTED','REGISTRATION_APPROVED','REGISTRATION_REJECTED',
    'TOPIC_SUBMITTED','TOPIC_APPROVED','TOPIC_REJECTED',
    'TEACHER_ASSIGNED','TEACHER_ACCEPTED','TEACHER_REJECTED','TOPIC_PUBLISHED',
    'STUDENT_APPLIED','APPLICATION_APPROVED','APPLICATION_REJECTED',
    'BINOME_INVITATION','BINOME_ACCEPTED','BINOME_DECLINED',
    'INTERNSHIP_STARTED','INTERNSHIP_COMPLETED','INTERNSHIP_CANCELLED',
    'DOCUMENT_UPLOADED','DOCUMENT_APPROVED','DOCUMENT_REJECTED',
    'MESSAGE_RECEIVED',
    'MINI_PRESENTATION_SCHEDULED','MINI_PRESENTATION_REMINDER',
    'DEFENSE_SCHEDULED','DEFENSE_UPDATED','GRADE_AVAILABLE',
    'DEADLINE_APPROACHING','DEADLINE_OVERDUE',
    'ACCOUNT_CREATED','PASSWORD_RESET',
    'REVISION_REQUESTED',
    'STUDENT_TOPIC_SUBMITTED',
    'STUDENT_TOPIC_APPROVED',
    'STUDENT_TOPIC_REJECTED',
    'COMPANY_DATES_CONFIRMED',
    'DEADLINE_REMINDER',
    'FINAL_REPORT_SUBMITTED',
    'FINAL_REPORT_TEACHER_VALIDATED',
    'FINAL_REPORT_COMPANY_VALIDATED',
    'FINAL_REPORT_ADMIN_CONFIRMED'
  ) NOT NULL;

-- 13. Create SystemDeadline table
CREATE TABLE IF NOT EXISTS systemdeadline (
  id        VARCHAR(191) NOT NULL,
  label     VARCHAR(200) NOT NULL,
  dueDate   DATETIME NOT NULL,
  isActive  BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- =============================================================
-- VERIFICATION QUERIES (run after migration to confirm)
-- =============================================================
-- SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = 'PFE_esst' AND TABLE_NAME = 'internship';
-- SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = 'PFE_esst' AND TABLE_NAME = 'topic';
-- SHOW TABLES LIKE 'systemdeadline';
