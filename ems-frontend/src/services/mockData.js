// Initial mock data with realistic EMS data across departments and roles

export const initialEmployees = [
  {
    id: 1,
    employee_code: "EMP-101",
    name: "Sarah Connor",
    email: "admin@ems.com",
    phone: "+1 (555) 234-5678",
    department: "Executive",
    designation: "Chief Operations Officer",
    role: "admin",
    status: "Active",
    salary: "$145,000",
    joining_date: "2022-01-15",
    avatar: "SC"
  },
  {
    id: 2,
    employee_code: "EMP-102",
    name: "Alex Murphy",
    email: "manager@ems.com",
    phone: "+1 (555) 345-6789",
    department: "Engineering",
    designation: "Lead Software Architect",
    role: "manager",
    status: "Active",
    salary: "$125,000",
    joining_date: "2022-04-10",
    avatar: "AM"
  },
  {
    id: 3,
    employee_code: "EMP-103",
    name: "David Miller",
    email: "employee@ems.com",
    phone: "+1 (555) 456-7890",
    department: "Engineering",
    designation: "Senior Frontend Developer",
    role: "employee",
    status: "Active",
    salary: "$95,000",
    joining_date: "2023-02-01",
    avatar: "DM"
  },
  {
    id: 4,
    employee_code: "EMP-104",
    name: "Elena Rostova",
    email: "elena.rostova@ems.com",
    phone: "+1 (555) 567-8901",
    department: "Product Design",
    designation: "Principal UI/UX Designer",
    role: "manager",
    status: "Active",
    salary: "$110,000",
    joining_date: "2022-08-20",
    avatar: "ER"
  },
  {
    id: 5,
    employee_code: "EMP-105",
    name: "Marcus Vance",
    email: "marcus.vance@ems.com",
    phone: "+1 (555) 678-9012",
    department: "Engineering",
    designation: "Full Stack Engineer",
    role: "employee",
    status: "Active",
    salary: "$88,000",
    joining_date: "2023-05-12",
    avatar: "MV"
  },
  {
    id: 6,
    employee_code: "EMP-106",
    name: "Chloe Bennett",
    email: "chloe.b@ems.com",
    phone: "+1 (555) 789-0123",
    department: "Human Resources",
    designation: "HR Business Partner",
    role: "manager",
    status: "Active",
    salary: "$90,000",
    joining_date: "2022-11-05",
    avatar: "CB"
  },
  {
    id: 7,
    employee_code: "EMP-107",
    name: "Liam O'Connor",
    email: "liam.oc@ems.com",
    phone: "+1 (555) 890-1234",
    department: "Marketing",
    designation: "Growth Marketing Specialist",
    role: "employee",
    status: "Active",
    salary: "$76,000",
    joining_date: "2023-09-15",
    avatar: "LO"
  },
  {
    id: 8,
    employee_code: "EMP-108",
    name: "Rachel Green",
    email: "rachel.g@ems.com",
    phone: "+1 (555) 901-2345",
    department: "Finance",
    designation: "Financial Analyst",
    role: "employee",
    status: "Inactive",
    salary: "$82,000",
    joining_date: "2023-03-10",
    avatar: "RG"
  }
];

export const initialProjects = [
  {
    id: 1,
    name: "NextGen Cloud ERP",
    description: "Enterprise resource planning overhaul with automated payroll and multi-region tax compliance.",
    client: "Internal / Core Platform",
    manager_id: 2,
    manager_name: "Alex Murphy",
    team_ids: [2, 3, 5],
    start_date: "2026-01-10",
    deadline: "2026-12-15",
    status: "In Progress",
    priority: "High",
    progress: 68
  },
  {
    id: 2,
    name: "Customer Portal Redesign",
    description: "Modern customer dashboard featuring live support chat, invoice management, and self-service analytics.",
    client: "Fintech Global Inc",
    manager_id: 4,
    manager_name: "Elena Rostova",
    team_ids: [3, 4, 7],
    start_date: "2026-02-01",
    deadline: "2026-11-30",
    status: "In Progress",
    priority: "Medium",
    progress: 82
  },
  {
    id: 3,
    name: "AI Talent Match & Hiring",
    description: "Automated candidate screening and skills matching system integrated with ATS.",
    client: "Talent Acquisition Ops",
    manager_id: 6,
    manager_name: "Chloe Bennett",
    team_ids: [5, 6],
    start_date: "2026-03-15",
    deadline: "2026-10-25",
    status: "Planning",
    priority: "Urgent",
    progress: 35
  },
  {
    id: 4,
    name: "ISO 27001 Security Audit",
    description: "Security posture enhancement, penetration testing, and compliance documentation.",
    client: "Infosec & Compliance",
    manager_id: 2,
    manager_name: "Alex Murphy",
    team_ids: [2, 5],
    start_date: "2025-11-01",
    deadline: "2026-04-30",
    status: "Completed",
    priority: "High",
    progress: 100
  }
];

export const initialTasks = [
  {
    id: 1,
    title: "Implement OAuth2 / JWT Authentication Flow",
    description: "Set up token refresh rotation and role claim verification for Admin, Manager and Employee tiers.",
    project_id: 1,
    project_name: "NextGen Cloud ERP",
    assignee_id: 3,
    assignee_name: "David Miller",
    priority: "High",
    status: "In Progress",
    deadline: "2026-11-05",
    created_at: "2026-10-20"
  },
  {
    id: 2,
    title: "Design Responsive Navigation & Role Sidebar",
    description: "Craft modern sidebar layout that conditionally highlights permitted items per role.",
    project_id: 2,
    project_name: "Customer Portal Redesign",
    assignee_id: 4,
    assignee_name: "Elena Rostova",
    priority: "Medium",
    status: "Completed",
    deadline: "2026-10-28",
    created_at: "2026-10-18"
  },
  {
    id: 3,
    title: "Database schema migration for attendance logs",
    description: "Add indexing on employee_id and clock_in timestamp for performant weekly reports.",
    project_id: 1,
    project_name: "NextGen Cloud ERP",
    assignee_id: 5,
    assignee_name: "Marcus Vance",
    priority: "High",
    status: "In Progress",
    deadline: "2026-11-08",
    created_at: "2026-10-22"
  },
  {
    id: 4,
    title: "Build Leave Approval & Notification Flow",
    description: "Allow managers to approve or reject leave applications with optional comments.",
    project_id: 3,
    project_name: "AI Talent Match & Hiring",
    assignee_id: 3,
    assignee_name: "David Miller",
    priority: "Urgent",
    status: "Pending",
    deadline: "2026-11-03",
    created_at: "2026-10-26"
  },
  {
    id: 5,
    title: "Q4 Product Launch Marketing Assets",
    description: "Prepare social collateral, release notes email templates, and landing page copy.",
    project_id: 2,
    project_name: "Customer Portal Redesign",
    assignee_id: 7,
    assignee_name: "Liam O'Connor",
    priority: "Medium",
    status: "Pending",
    deadline: "2026-11-12",
    created_at: "2026-10-25"
  },
  {
    id: 6,
    title: "Annual Security Audit Remediation",
    description: "Close out open items from penetration testing and update TLS cipher suites.",
    project_id: 4,
    project_name: "ISO 27001 Security Audit",
    assignee_id: 2,
    assignee_name: "Alex Murphy",
    priority: "High",
    status: "Completed",
    deadline: "2026-04-20",
    created_at: "2026-04-01"
  }
];

export const initialAttendance = [
  {
    id: 1,
    employee_id: 3,
    employee_name: "David Miller",
    date: "2026-10-31",
    check_in: "09:02 AM",
    check_out: "05:45 PM",
    total_hours: 8.7,
    status: "Present",
    work_mode: "Office"
  },
  {
    id: 2,
    employee_id: 2,
    employee_name: "Alex Murphy",
    date: "2026-10-31",
    check_in: "08:45 AM",
    check_out: "05:15 PM",
    total_hours: 8.5,
    status: "Present",
    work_mode: "Remote"
  },
  {
    id: 3,
    employee_id: 1,
    employee_name: "Sarah Connor",
    date: "2026-10-31",
    check_in: "08:30 AM",
    check_out: "06:00 PM",
    total_hours: 9.5,
    status: "Present",
    work_mode: "Office"
  },
  {
    id: 4,
    employee_id: 5,
    employee_name: "Marcus Vance",
    date: "2026-10-31",
    check_in: "09:40 AM",
    check_out: "06:10 PM",
    total_hours: 8.5,
    status: "Late",
    work_mode: "Office"
  },
  {
    id: 5,
    employee_id: 4,
    employee_name: "Elena Rostova",
    date: "2026-10-31",
    check_in: "09:10 AM",
    check_out: "05:30 PM",
    total_hours: 8.3,
    status: "Present",
    work_mode: "Remote"
  },
  {
    id: 6,
    employee_id: 7,
    employee_name: "Liam O'Connor",
    date: "2026-10-31",
    check_in: "-",
    check_out: "-",
    total_hours: 0,
    status: "Leave",
    work_mode: "Office"
  },
  // Previous days for trends
  {
    id: 7,
    employee_id: 3,
    date: "2026-10-30",
    employee_name: "David Miller",
    check_in: "08:58 AM",
    check_out: "05:30 PM",
    total_hours: 8.5,
    status: "Present",
    work_mode: "Office"
  },
  {
    id: 8,
    employee_id: 3,
    date: "2026-10-29",
    employee_name: "David Miller",
    check_in: "09:05 AM",
    check_out: "05:40 PM",
    total_hours: 8.6,
    status: "Present",
    work_mode: "Remote"
  },
  {
    id: 9,
    employee_id: 3,
    date: "2026-10-28",
    employee_name: "David Miller",
    check_in: "09:35 AM",
    check_out: "05:35 PM",
    total_hours: 8.0,
    status: "Late",
    work_mode: "Office"
  },
  {
    id: 10,
    employee_id: 3,
    date: "2026-10-27",
    employee_name: "David Miller",
    check_in: "08:50 AM",
    check_out: "05:20 PM",
    total_hours: 8.5,
    status: "Present",
    work_mode: "Office"
  }
];

export const initialLeaves = [
  {
    id: 1,
    employee_id: 7,
    employee_name: "Liam O'Connor",
    department: "Marketing",
    leave_type: "Casual Leave",
    start_date: "2026-10-31",
    end_date: "2026-11-01",
    days: 2,
    reason: "Personal family obligation and travel.",
    status: "Approved",
    applied_on: "2026-10-28",
    reviewer_comments: "Approved. Hand off marketing campaigns to Rachel."
  },
  {
    id: 2,
    employee_id: 3,
    employee_name: "David Miller",
    department: "Engineering",
    leave_type: "Sick Leave",
    start_date: "2026-11-10",
    end_date: "2026-11-11",
    days: 2,
    reason: "Scheduled dental surgery and recovery.",
    status: "Pending",
    applied_on: "2026-10-30",
    reviewer_comments: ""
  },
  {
    id: 3,
    employee_id: 5,
    employee_name: "Marcus Vance",
    department: "Engineering",
    leave_type: "Annual Leave",
    start_date: "2026-12-22",
    end_date: "2026-12-30",
    days: 7,
    reason: "Year-end holiday vacation with family.",
    status: "Pending",
    applied_on: "2026-10-25",
    reviewer_comments: ""
  },
  {
    id: 4,
    employee_id: 8,
    employee_name: "Rachel Green",
    department: "Finance",
    leave_type: "Unpaid Leave",
    start_date: "2026-09-01",
    end_date: "2026-09-05",
    days: 5,
    reason: "Higher studies certificate exam preparation.",
    status: "Approved",
    applied_on: "2026-08-20",
    reviewer_comments: "Approved by finance director."
  }
];

