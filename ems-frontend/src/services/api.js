const API_URL = `${window.location.protocol}//${window.location.hostname}/ems-backend/api`;

// Core HTTP fetch wrapper with standard error handling
async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      const error = new Error(result.message || `API request failed with status ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return result.data !== undefined ? result.data : result;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// -------------------------------------------------------------
// AUTHENTICATION SERVICES
// -------------------------------------------------------------
export async function loginUser(email, password) {
  return request('/auth.php', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function getCurrentUser() {
  return request('/auth.php', { method: 'GET' });
}

export async function logoutUser() {
  return request('/auth.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'logout' })
  });
}

export async function changePassword(newPassword, confirmPassword) {
  return request('/auth.php', {
    method: 'POST',
    body: JSON.stringify({
      action: 'change_password',
      new_password: newPassword,
      confirm_password: confirmPassword
    })
  });
}

// -------------------------------------------------------------
// EMPLOYEE SERVICES (Database Table: employees)
// -------------------------------------------------------------
export async function getEmployees() {
  return request('/employees.php', { method: 'GET' });
}

export async function getEmployeeDirectory() {
  return request('/employees.php?view=directory', { method: 'GET' });
}

export async function getEmployeeById(id) {
  return request(`/employees.php?id=${id}`, { method: 'GET' });
}

export async function createEmployee(employeeData) {
  return request('/employees.php', {
    method: 'POST',
    body: JSON.stringify(employeeData)
  });
}

export async function updateEmployee(id, employeeData) {
  return request(`/employees.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(employeeData)
  });
}

export async function toggleEmployeeStatus(id) {
  return request(`/employees.php?action=toggle_status&id=${id}`, {
    method: 'PATCH'
  });
}

export async function deleteEmployee(id) {
  return request(`/employees.php?id=${id}`, {
    method: 'DELETE'
  });
}

// -------------------------------------------------------------
// PROJECT SERVICES (Database Table: projects & project_members)
// -------------------------------------------------------------
export async function getProjects() {
  return request('/projects.php', { method: 'GET' });
}

export async function createProject(projectData) {
  return request('/projects.php', {
    method: 'POST',
    body: JSON.stringify(projectData)
  });
}

export async function updateProject(id, projectData) {
  return request(`/projects.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(projectData)
  });
}

export async function deleteProject(id) {
  return request(`/projects.php?id=${id}`, {
    method: 'DELETE'
  });
}

// -------------------------------------------------------------
// TASK SERVICES (Database Table: tasks)
// -------------------------------------------------------------
export async function getTasks() {
  return request('/tasks.php', { method: 'GET' });
}

function dateRangeQuery(from, to) {
  if (!from || !to) return '';
  return `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

export async function getTasksForDateRange(from, to) {
  return request(`/tasks.php${dateRangeQuery(from, to)}`, { method: 'GET' });
}

export async function createTask(taskData) {
  return request('/tasks.php', {
    method: 'POST',
    body: JSON.stringify(taskData)
  });
}

export async function updateTask(id, taskData) {
  return request(`/tasks.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(taskData)
  });
}

export async function updateTaskStatus(id, newStatus) {
  return request(`/tasks.php?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus })
  });
}

export async function deleteTask(id) {
  return request(`/tasks.php?id=${id}`, {
    method: 'DELETE'
  });
}

// -------------------------------------------------------------
// ATTENDANCE & LEAVE SERVICES (Database Tables: attendance & leaves)
// -------------------------------------------------------------
export async function getAttendance(employeeId = null) {
  const query = employeeId ? `?employee_id=${employeeId}` : '';
  return request(`/attendance.php${query}`, { method: 'GET' });
}

export async function getAttendanceForDateRange(from, to) {
  return request(`/attendance.php${dateRangeQuery(from, to)}`, { method: 'GET' });
}

export async function punchClockIn(employeeId, employeeName, workMode = 'Office') {
  return request('/attendance.php?action=clock_in', {
    method: 'POST',
    body: JSON.stringify({
      employee_id: employeeId,
      employee_name: employeeName,
      work_mode: workMode
    })
  });
}

export async function punchClockOut(employeeId) {
  return request('/attendance.php?action=clock_out', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId })
  });
}

export async function recordAttendance(recordData) {
  return request('/attendance.php', {
    method: 'POST',
    body: JSON.stringify(recordData)
  });
}

export async function getLeaves(employeeId = null) {
  const query = employeeId ? `?employee_id=${employeeId}` : '';
  return request(`/leaves.php${query}`, { method: 'GET' });
}

export async function getLeavesForDateRange(from, to) {
  return request(`/leaves.php${dateRangeQuery(from, to)}`, { method: 'GET' });
}

export async function applyLeave(leaveData) {
  return request('/leaves.php', {
    method: 'POST',
    body: JSON.stringify(leaveData)
  });
}

export async function updateLeaveStatus(id, status, reviewer_comments = '') {
  return request(`/leaves.php?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reviewer_comments })
  });
}

// -------------------------------------------------------------
// DASHBOARD & REPORTS (Live Database Aggregations)
// -------------------------------------------------------------
export async function getDashboardStats() {
  return request('/dashboard.php', { method: 'GET' });
}
