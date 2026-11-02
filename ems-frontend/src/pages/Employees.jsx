import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getEmployeeDirectory,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee
} from '../services/api';
import Modal from '../components/common/Modal';
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldIcon
} from '../components/common/Icons';
import './Employees.css';

export function Employees() {
  const { role, canManageEmployees } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [addError, setAddError] = useState('');

  // Form state
  const initialForm = {
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    department: 'Engineering',
    designation: '',
    role: 'employee',
    status: 'Active',
    salary: '$85,000',
    joining_date: new Date().toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState(initialForm);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployeeDirectory();
      setEmployees(data);
      setError('');
    } catch {
      setError('Could not load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleOpenAdd = () => {
    const nextCode = `EMP-${100 + employees.length + 1}`;
    setFormData({ ...initialForm, employee_code: nextCode });
    setAddError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      department: emp.department,
      designation: emp.designation,
      role: emp.role || 'employee',
      status: emp.status,
      salary: emp.salary || '$80,000',
      joining_date: emp.joining_date || new Date().toISOString().split('T')[0]
    });
    setIsEditModalOpen(true);
  };

  const handleOpenView = (emp) => {
    setSelectedEmployee(emp);
    setIsViewModalOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    try {
      const result = await createEmployee(formData);
      setIsAddModalOpen(false);
      setCreatedCredentials({
        email: result.employee.email,
        temporaryPassword: result.temporary_password
      });
      loadEmployees();
    } catch (error) {
      setAddError(error.message || 'Could not create the employee account.');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      await updateEmployee(selectedEmployee.id, formData);
      setIsEditModalOpen(false);
      loadEmployees();
    } catch (err) {
      alert('Error updating employee: ' + err.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    if (!canManageEmployees) {
      alert('Only administrators have permission to deactivate or activate staff.');
      return;
    }
    const action = currentStatus === 'Active' ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} this employee?`)) {
      try {
        await toggleEmployeeStatus(id);
        loadEmployees();
      } catch (_err) {
        alert('Failed to update status');
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (!canManageEmployees) {
      alert('Only administrators have permission to delete staff records.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        await deleteEmployee(id);
        loadEmployees();
      } catch (_err) {
        alert('Failed to delete employee');
      }
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const totalEmployees = employees.length;
  const activeCount = employees.filter(e => e.status === 'Active').length;
  const inactiveCount = totalEmployees - activeCount;
  const departmentsList = ['All', 'Engineering', 'Product Design', 'Marketing', 'Human Resources', 'Finance', 'Operations', 'Executive'];

  return (
    <div className="employees-page">
      {/* Top Metric Cards */}
      <div className="emp-metrics-grid">
        <div className="emp-metric-card">
          <div className="metric-icon blue"><UsersIcon size={20} /></div>
          <div>
            <span className="metric-label">Total Workforce</span>
            <h3 className="metric-value">{totalEmployees}</h3>
          </div>
        </div>
        <div className="emp-metric-card">
          <div className="metric-icon green"><CheckCircleIcon size={20} /></div>
          <div>
            <span className="metric-label">Active Employees</span>
            <h3 className="metric-value">{activeCount}</h3>
          </div>
        </div>
        <div className="emp-metric-card">
          <div className="metric-icon red"><XCircleIcon size={20} /></div>
          <div>
            <span className="metric-label">Deactivated / Inactive</span>
            <h3 className="metric-value">{inactiveCount}</h3>
          </div>
        </div>
        <div className="emp-metric-card">
          <div className="metric-icon purple"><ShieldIcon size={20} /></div>
          <div>
            <span className="metric-label">Departments</span>
            <h3 className="metric-value">{new Set(employees.map(e => e.department)).size}</h3>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="emp-toolbar">
        <div className="toolbar-search-filter">
          <div className="search-input-box">
            <SearchIcon size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, code, role or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="emp-select-filter"
            >
              {departmentsList.map(dept => (
                <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="emp-select-filter"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="toolbar-actions">
          <div className="view-toggle-btns">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              Table
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card grid view"
            >
              Grid
            </button>
          </div>

          {canManageEmployees ? (
            <button
              type="button"
              className="add-emp-btn"
              onClick={handleOpenAdd}
            >
              <PlusIcon size={16} />
              <span>Add Employee</span>
            </button>
          ) : (
            <span className="read-only-notice">
              Viewing as {role} (Read Only)
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="emp-loading-state">
          <p>Loading employee directory...</p>
        </div>
      ) : error ? (
        <div className="emp-error-state">
          <p>{error}</p>
          <button onClick={loadEmployees} className="btn-secondary">Retry</button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="emp-empty-state">
          <UsersIcon size={40} />
          <h4>No employees found</h4>
          <p>Try adjusting your search filters or add a new employee record.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => (
                <tr key={employee.id} className={employee.status === 'Inactive' ? 'row-inactive' : ''}>
                  <td>
                    <span className="emp-code-pill">{employee.employee_code}</span>
                  </td>
                  <td>
                    <div className="emp-name-cell">
                      <div className="emp-table-avatar">{employee.avatar || employee.name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <strong>{employee.name}</strong>
                        <span className="emp-email-sub">{employee.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="emp-dept-tag">{employee.department}</span>
                  </td>
                  <td>{employee.designation}</td>
                  <td>
                    <div className="emp-contact-info">
                      <span>{employee.phone || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`emp-role-tag ${employee.role || 'employee'}`}>
                      {employee.role || 'employee'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle-btn ${employee.status?.toLowerCase() ?? 'active'}`}
                      onClick={() => handleToggleStatus(employee.id, employee.status)}
                      title={canManageEmployees ? "Click to toggle Active/Inactive" : "Status indicator"}
                      disabled={!canManageEmployees}
                    >
                      <span className="status-dot"></span>
                      {employee.status}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions-cell">
                      <button
                        type="button"
                        className="action-icon-btn view"
                        onClick={() => handleOpenView(employee)}
                        title="View Full Profile"
                      >
                        <EyeIcon size={15} />
                      </button>

                      {canManageEmployees && (
                        <>
                          <button
                            type="button"
                            className="action-icon-btn edit"
                            onClick={() => handleOpenEdit(employee)}
                            title="Edit Record"
                          >
                            <EditIcon size={15} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn delete"
                            onClick={() => handleDelete(employee.id, employee.name)}
                            title="Delete Employee"
                          >
                            <TrashIcon size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="emp-cards-grid">
          {filteredEmployees.map(employee => (
            <div key={employee.id} className={`emp-profile-card ${employee.status === 'Inactive' ? 'card-inactive' : ''}`}>
              <div className="card-top-header">
                <span className="emp-code-pill">{employee.employee_code}</span>
                <button
                  type="button"
                  className={`status-toggle-btn ${employee.status?.toLowerCase() ?? 'active'}`}
                  onClick={() => handleToggleStatus(employee.id, employee.status)}
                  disabled={!canManageEmployees}
                  title={canManageEmployees ? "Click to toggle status" : "Status"}
                >
                  <span className="status-dot"></span>
                  {employee.status}
                </button>
              </div>

              <div className="card-user-info">
                <div className="emp-card-avatar">{employee.avatar || employee.name.slice(0, 2).toUpperCase()}</div>
                <h4>{employee.name}</h4>
                <p className="card-designation">{employee.designation}</p>
                <span className="emp-dept-tag">{employee.department}</span>
              </div>

              <div className="card-details-list">
                <div className="card-detail-item">
                  <span className="detail-key">Email:</span>
                  <span className="detail-val">{employee.email}</span>
                </div>
                <div className="card-detail-item">
                  <span className="detail-key">Phone:</span>
                  <span className="detail-val">{employee.phone || 'N/A'}</span>
                </div>
                <div className="card-detail-item">
                  <span className="detail-key">Joined:</span>
                  <span className="detail-val">{employee.joining_date || 'N/A'}</span>
                </div>
              </div>

              <div className="card-footer-actions">
                <button
                  type="button"
                  className="btn-card-action view"
                  onClick={() => handleOpenView(employee)}
                >
                  <EyeIcon size={14} /> Profile
                </button>

                {canManageEmployees && (
                  <>
                    <button
                      type="button"
                      className="btn-card-action edit"
                      onClick={() => handleOpenEdit(employee)}
                    >
                      <EditIcon size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn-card-action delete"
                      onClick={() => handleDelete(employee.id, employee.name)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
        maxWidth={620}
      >
        <form onSubmit={handleSaveAdd} className="modal-form">
          {addError && <div className="employee-form-error" role="alert">{addError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Employee Code *</label>
              <input
                type="text"
                required
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                placeholder="e.g. EMP-109"
              />
            </div>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@ems.com"
              />
            </div>
            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="Engineering">Engineering</option>
                <option value="Product Design">Product Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Executive">Executive</option>
              </select>
            </div>
            <div className="form-group">
              <label>Designation *</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Frontend Engineer"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Access Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Salary / Compensation</label>
              <input
                type="text"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="$85,000"
              />
            </div>
            <div className="form-group">
              <label>Joining Date</label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Employee
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Account created"
        maxWidth={500}
      >
        {createdCredentials && (
          <div className="credential-reveal">
            <p>
              Share these sign-in details with the employee using a secure channel.
              This temporary password is shown only once.
            </p>
            <div className="credential-value">
              <span>Work email</span>
              <strong>{createdCredentials.email}</strong>
            </div>
            <div className="credential-value">
              <span>One-time password</span>
              <code>{createdCredentials.temporaryPassword}</code>
            </div>
            <p className="credential-reminder">
              They must choose a new password before accessing their dashboard.
            </p>
            <div className="form-actions">
              <button type="button" className="btn-primary" onClick={() => setCreatedCredentials(null)}>
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Record: ${selectedEmployee?.name}`}
        maxWidth={620}
      >
        <form onSubmit={handleSaveEdit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Employee Code</label>
              <input
                type="text"
                required
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="Engineering">Engineering</option>
                <option value="Product Design">Product Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Executive">Executive</option>
              </select>
            </div>
            <div className="form-group">
              <label>Designation *</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Access Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status (Deactivate/Activate)</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive (Deactivated)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Salary</label>
              <input
                type="text"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Joining Date</label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW EMPLOYEE MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Employee Profile Details"
        maxWidth={500}
      >
        {selectedEmployee && (
          <div className="view-profile-content">
            <div className="profile-header-view">
              <div className="profile-large-avatar">
                {selectedEmployee.avatar || selectedEmployee.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="profile-header-info">
                <h3>{selectedEmployee.name}</h3>
                <p className="profile-designation">{selectedEmployee.designation}</p>
                <div className="profile-pill-row">
                  <span className="emp-code-pill">{selectedEmployee.employee_code}</span>
                  <span className={`status-pill ${selectedEmployee.status?.toLowerCase()}`}>
                    {selectedEmployee.status}
                  </span>
                  <span className={`emp-role-tag ${selectedEmployee.role}`}>
                    {selectedEmployee.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="profile-data-box">
                <span className="data-box-label">Department</span>
                <span className="data-box-val">{selectedEmployee.department}</span>
              </div>
              <div className="profile-data-box">
                <span className="data-box-label">Email Address</span>
                <span className="data-box-val">{selectedEmployee.email}</span>
              </div>
              <div className="profile-data-box">
                <span className="data-box-label">Phone Contact</span>
                <span className="data-box-val">{selectedEmployee.phone || 'Not provided'}</span>
              </div>
              <div className="profile-data-box">
                <span className="data-box-label">Joining Date</span>
                <span className="data-box-val">{selectedEmployee.joining_date || 'N/A'}</span>
              </div>
              {canManageEmployees && (
                <div className="profile-data-box">
                  <span className="data-box-label">Compensation</span>
                  <span className="data-box-val">{selectedEmployee.salary || 'Confidential'}</span>
                </div>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: 24 }}>
              {canManageEmployees && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenEdit(selectedEmployee);
                  }}
                >
                  Edit This Employee
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Employees;
