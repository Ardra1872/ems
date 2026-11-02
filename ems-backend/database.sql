-- EMS Complete Database Schema and Seed Data

USE ems;

-- 1. Alter employees table to ensure all necessary fields exist
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'password123',
  ADD COLUMN IF NOT EXISTS salary VARCHAR(50) DEFAULT '$75,000',
  ADD COLUMN IF NOT EXISTS avatar VARCHAR(10) DEFAULT '';

-- Update existing records
UPDATE employees SET role = 'admin', phone = '+1 (555) 234-5678', salary = '$140,000', avatar = 'AT' WHERE id = 1;
UPDATE employees SET role = 'manager', phone = '+1 (555) 345-6789', salary = '$110,000', avatar = 'AR' WHERE id = 2;
UPDATE employees SET role = 'employee', phone = '+1 (555) 456-7890', salary = '$85,000', avatar = 'RJ' WHERE id = 3;
UPDATE employees SET role = 'employee', phone = '+1 (555) 567-8901', salary = '$90,000', avatar = 'MN' WHERE id = 4;

-- Insert default admin, manager, employee credentials if not present
INSERT IGNORE INTO employees (id, employee_code, name, email, department, designation, role, status, phone, salary, avatar, joining_date)
VALUES
(5, 'EMP005', 'Sarah Connor', 'admin@ems.com', 'Executive', 'Chief Operations Officer', 'admin', 'Active', '+1 (555) 111-2222', '$145,000', 'SC', '2024-01-15'),
(6, 'EMP006', 'Alex Murphy', 'manager@ems.com', 'Development', 'Engineering Lead', 'manager', 'Active', '+1 (555) 222-3333', '$125,000', 'AM', '2024-03-20'),
(7, 'EMP007', 'David Miller', 'employee@ems.com', 'Development', 'Frontend Developer', 'employee', 'Active', '+1 (555) 333-4444', '$92,000', 'DM', '2024-06-10');

-- After importing this schema and its employee data, run migrations/migrate_users.php.

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  client VARCHAR(100) DEFAULT 'Internal Project',
  manager_id INT NOT NULL,
  manager_name VARCHAR(100),
  start_date DATE,
  deadline DATE,
  status ENUM('Planning', 'In Progress', 'On Hold', 'Completed') DEFAULT 'Planning',
  priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
  progress INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  employee_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_project_member (project_id, employee_id)
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  project_id INT NOT NULL,
  project_name VARCHAR(150),
  assignee_id INT NOT NULL,
  assignee_name VARCHAR(100),
  priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
  status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  employee_name VARCHAR(100),
  date DATE NOT NULL,
  check_in VARCHAR(20) DEFAULT '-',
  check_out VARCHAR(20) DEFAULT '-',
  total_hours DECIMAL(4, 2) DEFAULT 0.00,
  status ENUM('Present', 'Late', 'Half Day', 'Leave', 'Absent') DEFAULT 'Present',
  work_mode ENUM('Office', 'Remote') DEFAULT 'Office',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_daily_attendance (employee_id, date)
);

-- 6. Leaves Table
CREATE TABLE IF NOT EXISTS leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  employee_name VARCHAR(100),
  department VARCHAR(100),
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(3, 1) DEFAULT 1.0,
  reason TEXT,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  reviewer_comments TEXT,
  applied_on DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial Projects if empty
INSERT IGNORE INTO projects (id, name, description, client, manager_id, manager_name, start_date, deadline, status, priority, progress)
VALUES
(1, 'NextGen Cloud ERP', 'Enterprise resource planning overhaul with automated payroll and multi-region tax compliance.', 'Internal / Core Platform', 2, 'Anjali Roy', '2026-01-10', '2026-12-15', 'In Progress', 'High', 68),
(2, 'Customer Portal Redesign', 'Modern customer dashboard featuring live support chat, invoice management, and self-service analytics.', 'Fintech Global Inc', 6, 'Alex Murphy', '2026-02-01', '2026-11-30', 'In Progress', 'Medium', 82),
(3, 'AI Talent Match & Hiring', 'Automated candidate screening and skills matching system integrated with ATS.', 'Talent Acquisition Ops', 6, 'Alex Murphy', '2026-03-15', '2026-10-25', 'Planning', 'Urgent', 35),
(4, 'ISO 27001 Security Audit', 'Security posture enhancement, penetration testing, and compliance documentation.', 'Infosec & Compliance', 1, 'Arun Thomas', '2025-11-01', '2026-04-30', 'Completed', 'High', 100);

-- Seed Project Members
INSERT IGNORE INTO project_members (project_id, employee_id)
VALUES
(1, 1), (1, 2), (1, 3), (1, 7),
(2, 2), (2, 4), (2, 7),
(3, 3), (3, 6),
(4, 1), (4, 4);

-- Seed initial Tasks if empty
INSERT IGNORE INTO tasks (id, title, description, project_id, project_name, assignee_id, assignee_name, priority, status, deadline)
VALUES
(1, 'Implement OAuth2 / JWT Authentication Flow', 'Set up token refresh rotation and role claim verification for Admin, Manager and Employee tiers.', 1, 'NextGen Cloud ERP', 3, 'Rahul Jose', 'High', 'In Progress', '2026-11-05'),
(2, 'Design Responsive Navigation & Role Sidebar', 'Craft modern sidebar layout that conditionally highlights permitted items per role.', 2, 'Customer Portal Redesign', 7, 'David Miller', 'Medium', 'Completed', '2026-10-28'),
(3, 'Database schema migration for attendance logs', 'Add indexing on employee_id and clock_in timestamp for performant weekly reports.', 1, 'NextGen Cloud ERP', 1, 'Arun Thomas', 'High', 'In Progress', '2026-11-08'),
(4, 'Build Leave Approval & Notification Flow', 'Allow managers to approve or reject leave applications with optional comments.', 3, 'AI Talent Match & Hiring', 7, 'David Miller', 'Urgent', 'Pending', '2026-11-03'),
(5, 'Prepare Security Audit Remediation Report', 'Document firewall rule tightening and TLS configuration updates.', 4, 'ISO 27001 Security Audit', 2, 'Anjali Roy', 'High', 'Completed', '2026-04-20');

-- Seed Attendance records
INSERT IGNORE INTO attendance (id, employee_id, employee_name, date, check_in, check_out, total_hours, status, work_mode)
VALUES
(1, 1, 'Arun Thomas', CURDATE(), '08:45 AM', '05:30 PM', 8.75, 'Present', 'Office'),
(2, 2, 'Anjali Roy', CURDATE(), '09:00 AM', '05:45 PM', 8.75, 'Present', 'Remote'),
(3, 3, 'Rahul Jose', CURDATE(), '09:30 AM', '06:00 PM', 8.50, 'Late', 'Office'),
(4, 5, 'Sarah Connor', CURDATE(), '08:30 AM', '06:00 PM', 9.50, 'Present', 'Office'),
(5, 7, 'David Miller', CURDATE(), '09:05 AM', '-', 0.00, 'Present', 'Office');

-- Seed Leave requests
INSERT IGNORE INTO leaves (id, employee_id, employee_name, department, leave_type, start_date, end_date, days, reason, status, applied_on, reviewer_comments)
VALUES
(1, 4, 'Meera Nair', 'Development', 'Casual Leave', '2026-11-05', '2026-11-06', 2.0, 'Personal family function and travel.', 'Approved', '2026-10-29', 'Approved. Please coordinate tasks with Rahul.'),
(2, 7, 'David Miller', 'Development', 'Sick Leave', '2026-11-12', '2026-11-13', 2.0, 'Dental surgery and recovery period.', 'Pending', '2026-10-31', ''),
(3, 3, 'Rahul Jose', 'Design', 'Annual Leave', '2026-12-24', '2026-12-30', 5.0, 'Year-end vacation with family.', 'Pending', '2026-10-28', '');
