import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAttendance,
  punchClockIn,
  punchClockOut,
  recordAttendance,
  getLeaves,
  applyLeave,
  updateLeaveStatus,
  getEmployees
} from '../services/api';
import Modal from '../components/common/Modal';
import {
  AttendanceIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  PlusIcon,
  SearchIcon
} from '../components/common/Icons';
import './Attendance.css';

export function Attendance() {
  const { user, canApproveLeaves, isEmployee } = useAuth();

  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaves'
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Punch Clock state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [workMode, setWorkMode] = useState('Office');
  const [todayRecord, setTodayRecord] = useState(null);

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isManualAttendanceModalOpen, setIsManualAttendanceModalOpen] = useState(false);
  const [isReviewLeaveModalOpen, setIsReviewLeaveModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewerComment, setReviewerComment] = useState('');

  // Forms
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Casual Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    days: 1,
    reason: ''
  });

  const [manualForm, setManualForm] = useState({
    employee_id: '',
    employee_name: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '09:00 AM',
    check_out: '05:30 PM',
    total_hours: 8.5,
    status: 'Present',
    work_mode: 'Office'
  });

  // Filter
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Live Clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const [attData, leaveData, empData] = await Promise.all([
        getAttendance(),
        getLeaves(),
        getEmployees()
      ]);
      setAttendanceLogs(attData);
      setLeaveRequests(leaveData);
      setEmployees(empData);

      // Find today's record for current user
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLog = attData.find(a => a.employee_id === user?.id && a.date === todayStr);
      setTodayRecord(todayLog || null);
    } catch (e) {
      console.error('Failed to load attendance & leaves', e);
    }
  }, [user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Clock in/out handlers
  const handleClockIn = async () => {
    try {
      const res = await punchClockIn(user.id, user.name, workMode);
      setTodayRecord(res);
      loadAllData();
    } catch (e) {
      alert('Clock-in failed: ' + e.message);
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await punchClockOut(user.id);
      setTodayRecord(res);
      loadAllData();
    } catch (e) {
      alert('Clock-out failed: ' + e.message);
    }
  };

  // Leave Form handlers
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...leaveForm,
        employee_id: user.id,
        employee_name: user.name,
        department: user.department || 'Operations'
      };
      await applyLeave(payload);
      setIsLeaveModalOpen(false);
      setLeaveForm({
        leave_type: 'Casual Leave',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        days: 1,
        reason: ''
      });
      loadAllData();
    } catch (e) {
      alert('Error applying leave: ' + e.message);
    }
  };

  // Review Leave handlers (Approve / Reject)
  const handleOpenReview = (leave) => {
    setSelectedLeave(leave);
    setReviewerComment(leave.reviewer_comments || '');
    setIsReviewLeaveModalOpen(true);
  };

  const handleSaveReview = async (newStatus, leaveOverride = null) => {
    const leaveToUpdate = leaveOverride || selectedLeave;
    if (!leaveToUpdate) return;
    try {
      await updateLeaveStatus(
        leaveToUpdate.id,
        newStatus,
        leaveOverride ? '' : reviewerComment
      );
      setIsReviewLeaveModalOpen(false);
      loadAllData();
    } catch (error) {
      alert('Failed to update leave request: ' + error.message);
    }
  };

  // Manual Attendance Record
  const handleSaveManualAttendance = async (e) => {
    e.preventDefault();
    try {
      const emp = employees.find(empItem => empItem.id === Number(manualForm.employee_id));
      const payload = {
        ...manualForm,
        employee_name: emp ? emp.name : 'Employee'
      };
      await recordAttendance(payload);
      setIsManualAttendanceModalOpen(false);
      loadAllData();
    } catch (error) {
      alert('Failed to record attendance: ' + error.message);
    }
  };

  // Filtered lists
  const filteredAttendance = attendanceLogs.filter(item => {
    const isSelfOrPermitted = !isEmployee || item.employee_id === user?.id;
    const matchesSearch = item.employee_name?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return isSelfOrPermitted && matchesSearch && matchesStatus;
  });

  const filteredLeaves = leaveRequests.filter(item => {
    const isSelfOrPermitted = !isEmployee || item.employee_id === user?.id;
    const matchesSearch = item.employee_name?.toLowerCase().includes(searchFilter.toLowerCase());
    return isSelfOrPermitted && matchesSearch;
  });
  const approvedLeaveDays = leaveType => leaveRequests
    .filter(leave => leave.status === 'Approved' && leave.leave_type === leaveType)
    .reduce((total, leave) => total + Number(leave.days || 0), 0);
  const remainingLeaveDays = (leaveType, allowance) => Math.max(0, allowance - approvedLeaveDays(leaveType));

  return (
    <div className="attendance-page">
      {/* Interactive Punch Clock Widget */}
      {isEmployee && (
      <div className="punch-clock-container">
        <div className="clock-visual-panel">
          <div className="digital-time-display">
            <ClockIcon size={24} className="clock-pulse" />
            <h2>{currentTime}</h2>
          </div>
          <span className="live-date-str">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="punch-actions-panel">
          <div className="workmode-select">
            <label>Work Location:</label>
            <div className="workmode-pills">
              <button
                type="button"
                className={`workmode-btn ${workMode === 'Office' ? 'active' : ''}`}
                onClick={() => setWorkMode('Office')}
              >
                🏢 Office
              </button>
              <button
                type="button"
                className={`workmode-btn ${workMode === 'Remote' ? 'active' : ''}`}
                onClick={() => setWorkMode('Remote')}
              >
                🏠 Remote
              </button>
            </div>
          </div>

          <div className="punch-buttons-row">
            {!todayRecord?.check_in || todayRecord?.check_in === '-' ? (
              <button
                type="button"
                className="punch-btn clock-in"
                onClick={handleClockIn}
              >
                <span>Clock In Now</span>
              </button>
            ) : !todayRecord?.check_out || todayRecord?.check_out === '-' ? (
              <button
                type="button"
                className="punch-btn clock-out"
                onClick={handleClockOut}
              >
                <span>Clock Out ({todayRecord.check_in})</span>
              </button>
            ) : (
              <div className="shift-completed-badge">
                <CheckCircleIcon size={18} />
                <span>Shift Completed ({todayRecord.total_hours} hrs)</span>
              </div>
            )}
          </div>
        </div>

        <div className="punch-summary-panel">
          <div className="punch-stat">
            <span className="p-label">Today's Check In</span>
            <strong className="p-val">{todayRecord?.check_in || '—'}</strong>
          </div>
          <div className="punch-stat">
            <span className="p-label">Check Out</span>
            <strong className="p-val">{todayRecord?.check_out || '—'}</strong>
          </div>
          <div className="punch-stat">
            <span className="p-label">Logged Hours</span>
            <strong className="p-val">{todayRecord?.total_hours ? `${todayRecord.total_hours}h` : '0.0h'}</strong>
          </div>
        </div>
      </div>
      )}

      {/* Tabs Switcher: Attendance History vs Leave Requests */}
      <div className="att-tab-nav">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <AttendanceIcon size={16} />
          <span>Attendance History & Logs</span>
        </button>

        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          <CalendarIcon size={16} />
          <span>{isEmployee ? 'My Leave Requests' : `Leave Management (${leaveRequests.filter(l => l.status === 'Pending').length} Pending)`}</span>
        </button>
      </div>

      {/* TAB 1: ATTENDANCE HISTORY */}
      {activeTab === 'attendance' && (
        <div className="tab-pane">
          <div className="att-history-toolbar">
            <div className="toolbar-left">
              <div className="search-input-box">
                <SearchIcon size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter by employee name..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="emp-select-filter"
              >
                <option value="All">All Attendance Status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            {canApproveLeaves && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const defaultEmp = employees[0];
                  setManualForm({
                    ...manualForm,
                    employee_id: defaultEmp ? defaultEmp.id : 1,
                    employee_name: defaultEmp ? defaultEmp.name : ''
                  });
                  setIsManualAttendanceModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <PlusIcon size={16} />
                <span>Record Attendance Manually</span>
              </button>
            )}
          </div>

          <div className="employee-table-container">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Total Duration</th>
                  <th>Mode</th>
                  <th>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className="emp-code-pill">{log.date}</span>
                    </td>
                    <td>
                      <div className="emp-name-cell">
                        <div className="emp-table-avatar">
                          {(log.employee_name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <strong>{log.employee_name}</strong>
                      </div>
                    </td>
                    <td>{log.check_in}</td>
                    <td>{log.check_out}</td>
                    <td>
                      <strong>{log.total_hours} hrs</strong>
                    </td>
                    <td>
                      <span className="mode-badge">{log.work_mode || 'Office'}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${log.status?.toLowerCase()}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LEAVE MANAGEMENT */}
      {activeTab === 'leaves' && (
        <div className="tab-pane">
          {/* Leave Balances Cards */}
          {isEmployee && <div className="leave-balances-grid">
            <div className="balance-card">
              <span className="bal-label">Casual Leave</span>
              <h3>{remainingLeaveDays('Casual Leave', 12)} <span>/ 12 days left</span></h3>
              <div className="bal-progress"><div className="bal-fill" style={{ width: `${remainingLeaveDays('Casual Leave', 12) / 12 * 100}%` }} /></div>
            </div>
            <div className="balance-card">
              <span className="bal-label">Sick Leave</span>
              <h3>{remainingLeaveDays('Sick Leave', 10)} <span>/ 10 days left</span></h3>
              <div className="bal-progress"><div className="bal-fill green" style={{ width: `${remainingLeaveDays('Sick Leave', 10) / 10 * 100}%` }} /></div>
            </div>
            <div className="balance-card">
              <span className="bal-label">Annual Leave</span>
              <h3>{remainingLeaveDays('Annual Leave', 20)} <span>/ 20 days left</span></h3>
              <div className="bal-progress"><div className="bal-fill purple" style={{ width: `${remainingLeaveDays('Annual Leave', 20) / 20 * 100}%` }} /></div>
            </div>
            <div className="balance-card apply-cta">
              <button
                type="button"
                className="btn-apply-leave"
                onClick={() => setIsLeaveModalOpen(true)}
              >
                <PlusIcon size={16} /> Apply for Leave
              </button>
            </div>
          </div>}

          {/* Leaves Table */}
          <div className="employee-table-container" style={{ marginTop: 20 }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration / Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Reviewer Comments</th>
                  {canApproveLeaves && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map(leave => (
                  <tr key={leave.id}>
                    <td>
                      <div className="emp-name-cell">
                        <div className="emp-table-avatar">
                          {(leave.employee_name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{leave.employee_name}</strong>
                          <span className="emp-email-sub">{leave.department}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="leave-type-tag">{leave.leave_type}</span>
                    </td>
                    <td>
                      <div className="leave-dates-cell">
                        <span>{leave.start_date}</span>
                        <span className="to-arrow">→</span>
                        <span>{leave.end_date}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{leave.days} {leave.days === 1 ? 'day' : 'days'}</strong>
                    </td>
                    <td>
                      <span className="leave-reason-text">{leave.reason}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${leave.status?.toLowerCase()}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td>
                      <span className="reviewer-comments-cell">
                        {leave.reviewer_comments || '—'}
                      </span>
                    </td>
                    {canApproveLeaves && (
                      <td style={{ textAlign: 'right' }}>
                        {Number(leave.employee_id) === Number(user?.id) ? (
                          <span className="reviewer-comments-cell">Your request</span>
                        ) : leave.status === 'Pending' ? (
                          <div className="leave-action-btns">
                            <button
                              type="button"
                              className="btn-approve"
                              onClick={() => {
                                setSelectedLeave(leave);
                                setReviewerComment('');
                                handleSaveReview('Approved', leave);
                              }}
                              title="Approve immediately"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-reject"
                              onClick={() => handleOpenReview(leave)}
                              title="Reject with notes"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="reviewer-comments-cell">Decision recorded</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPLY LEAVE MODAL */}
      {isEmployee && <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Apply for Leave"
        maxWidth={540}
      >
        <form onSubmit={handleApplyLeave} className="modal-form">
          <div className="form-group">
            <label>Leave Type *</label>
            <select
              value={leaveForm.leave_type}
              onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
            >
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick / Medical Leave</option>
              <option value="Annual Leave">Annual Vacation Leave</option>
              <option value="Maternity/Paternity">Parental Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                required
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                required
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Duration (Total Days)</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              required
              value={leaveForm.days}
              onChange={(e) => setLeaveForm({ ...leaveForm, days: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label>Reason for Leave *</label>
            <textarea
              rows={3}
              required
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="State the circumstances and handoff arrangements..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Submit Leave Request
            </button>
          </div>
        </form>
      </Modal>}

      {/* REVIEW LEAVE MODAL */}
      {canApproveLeaves && <Modal
        isOpen={isReviewLeaveModalOpen}
        onClose={() => setIsReviewLeaveModalOpen(false)}
        title={`Review Leave: ${selectedLeave?.employee_name}`}
        maxWidth={500}
      >
        <div className="modal-form">
          <div className="review-meta-box">
            <p><strong>Type:</strong> {selectedLeave?.leave_type}</p>
            <p><strong>Period:</strong> {selectedLeave?.start_date} to {selectedLeave?.end_date} ({selectedLeave?.days} days)</p>
            <p><strong>Reason:</strong> {selectedLeave?.reason}</p>
          </div>

          <div className="form-group">
            <label>Manager / Reviewer Notes:</label>
            <textarea
              rows={3}
              value={reviewerComment}
              onChange={(e) => setReviewerComment(e.target.value)}
              placeholder="Provide reason for approval or rejection..."
            />
          </div>

          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsReviewLeaveModalOpen(false)}
            >
              Cancel
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-reject-modal"
                onClick={() => handleSaveReview('Rejected')}
              >
                Reject Request
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSaveReview('Approved')}
              >
                Approve Leave
              </button>
            </div>
          </div>
        </div>
      </Modal>}

      {/* MANUAL ATTENDANCE MODAL */}
      {canApproveLeaves && <Modal
        isOpen={isManualAttendanceModalOpen}
        onClose={() => setIsManualAttendanceModalOpen(false)}
        title="Record Manual Attendance"
        maxWidth={540}
      >
        <form onSubmit={handleSaveManualAttendance} className="modal-form">
          <div className="form-group">
            <label>Select Employee *</label>
            <select
              value={manualForm.employee_id}
              onChange={(e) => setManualForm({ ...manualForm, employee_id: Number(e.target.value) })}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                required
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={manualForm.status}
                onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
              >
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">Leave</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Check In Time</label>
              <input
                type="text"
                value={manualForm.check_in}
                onChange={(e) => setManualForm({ ...manualForm, check_in: e.target.value })}
                placeholder="09:00 AM"
              />
            </div>
            <div className="form-group">
              <label>Check Out Time</label>
              <input
                type="text"
                value={manualForm.check_out}
                onChange={(e) => setManualForm({ ...manualForm, check_out: e.target.value })}
                placeholder="05:30 PM"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Total Hours</label>
              <input
                type="number"
                step="0.1"
                value={manualForm.total_hours}
                onChange={(e) => setManualForm({ ...manualForm, total_hours: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Work Mode</label>
              <select
                value={manualForm.work_mode}
                onChange={(e) => setManualForm({ ...manualForm, work_mode: e.target.value })}
              >
                <option value="Office">Office</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsManualAttendanceModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Attendance Record
            </button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}

export default Attendance;
