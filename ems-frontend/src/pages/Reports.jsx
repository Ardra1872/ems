import { useState, useEffect } from 'react';
import {
  getDashboardStats,
  getEmployees,
  getProjects,
  getTasksForDateRange,
  getLeavesForDateRange,
  getAttendanceForDateRange
} from '../services/api';
import {
  AttendanceTrendsChart,
  TaskCompletionDonut,
  DepartmentDistributionBar
} from '../components/common/Charts';
import {
  UsersIcon,
  CalendarIcon,
  ProjectsIcon,
  TasksIcon
} from '../components/common/Icons';

function getPeriodRange(period) {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (period === 'This Week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === 'This Month') {
    start.setDate(1);
  } else if (period === 'This Quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  } else {
    start.setMonth(0, 1);
  }
  const dateKey = date => (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  );
  return { from: dateKey(start), to: dateKey(end) };
}

export function Reports() {
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [period, setPeriod] = useState('This Month');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setLoadError('');
        const { from, to } = getPeriodRange(period);
        const [dashStats, emps, projs, tsks, lvs, att] = await Promise.all([
          getDashboardStats(),
          getEmployees(),
          getProjects(),
          getTasksForDateRange(from, to),
          getLeavesForDateRange(from, to),
          getAttendanceForDateRange(from, to)
        ]);
        setStats(dashStats);
        setEmployees(emps);
        setProjects(projs);
        setTasks(tsks);
        setLeaves(lvs);
        setAttendance(att);
      } catch (error) {
        setLoadError(error.message || 'Could not load reports.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period, reloadKey]);

  if (loading) {
    return <div className="emp-loading-state"><p>Generating analytical reports...</p></div>;
  }
  if (loadError) {
    return (
      <div className="emp-error-state" role="alert">
        <p>{loadError}</p>
        <button type="button" className="btn-secondary" onClick={() => setReloadKey(value => value + 1)}>
          Retry
        </button>
      </div>
    );
  }

  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
    : 0;
  const { from: rangeStart, to: rangeEnd } = getPeriodRange(period);
  const dateKey = date => {
    const key = String(date || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : '';
  };
  const inPeriod = date => {
    const key = dateKey(date);
    return key && key >= rangeStart && key <= rangeEnd;
  };
  const periodTasks = tasks.filter(task => inPeriod(task.created_at));
  const periodLeaves = leaves.filter(leave => inPeriod(leave.applied_on));
  const periodAttendance = attendance.filter(record => inPeriod(record.date));
  const periodCompletedTasks = periodTasks.filter(task => task.status === 'Completed').length;
  const attendanceByDay = new Map();
  periodAttendance.forEach(record => {
    const key = dateKey(record.date);
    const item = attendanceByDay.get(key) || {
      day: new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      present: 0,
      late: 0,
      absent: 0,
      leave: 0
    };
    if (record.status === 'Present') item.present += 1;
    if (record.status === 'Late') item.late += 1;
    if (record.status === 'Absent') item.absent += 1;
    if (record.status === 'Leave') item.leave += 1;
    attendanceByDay.set(key, item);
  });
  const periodAttendanceTrends = [...attendanceByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([, item]) => item);
  const periodTaskCompletionRate = periodTasks.length
    ? Math.round((periodCompletedTasks / periodTasks.length) * 100)
    : 0;

  return (
    <div className="reports-page">
      {/* Top Filter Bar */}
      <div className="emp-toolbar" style={{ marginBottom: 24 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Workforce & Operational Reports</h3>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Aggregate metrics, velocity and departmental trends</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="emp-select-filter"
          >
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Quarter">This Quarter</option>
            <option value="This Year">This Year</option>
          </select>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.print()}
            style={{ fontSize: 13 }}
          >
            🖨️ Export / Print Report
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <p>Workforce Size</p>
            <h2>{employees.length}</h2>
            <span className="note-sub text-green">{stats?.activeEmployees} Active ({stats?.inactiveEmployees} Inactive)</span>
          </div>
          <div className="stat-icon-wrapper blue">
            <UsersIcon size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <p>Average Project Progress</p>
            <h2>{avgProgress}%</h2>
            <span className="note-sub text-purple">{projects.length} Total Initiatives</span>
          </div>
          <div className="stat-icon-wrapper purple">
            <ProjectsIcon size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <p>Task Delivery Rate</p>
            <h2>{periodTaskCompletionRate}%</h2>
            <span className="note-sub text-blue">{periodCompletedTasks} Done of {periodTasks.length} created this period</span>
          </div>
          <div className="stat-icon-wrapper green">
            <TasksIcon size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <p>Approved Leaves</p>
            <h2>{periodLeaves.filter(l => l.status === 'Approved').length}</h2>
            <span className="note-sub text-orange">{periodLeaves.filter(l => l.status === 'Pending').length} Pending Review</span>
          </div>
          <div className="stat-icon-wrapper orange">
            <CalendarIcon size={22} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-charts-grid" style={{ marginBottom: 24 }}>
        <div className="chart-container-card">
          <AttendanceTrendsChart
            data={periodAttendanceTrends}
            title={`${period} Attendance Trends`}
          />
        </div>
        <div className="chart-container-card">
          <h3 className="chart-card-title">Task Completion Distribution</h3>
          <TaskCompletionDonut
            pending={periodTasks.filter(task => task.status === 'Pending').length}
            inProgress={periodTasks.filter(task => task.status === 'In Progress').length}
            completed={periodCompletedTasks}
          />
        </div>
      </div>

      {/* Department Breakdown & Detailed Project Table */}
      <div className="dashboard-bottom-grid">
        <div className="project-summaries-card">
          <div className="section-card-header">
            <h3>Project Performance & Milestone Breakdown</h3>
          </div>
          <div className="employee-table-container">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Manager</th>
                  <th>Priority</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.manager_name}</td>
                    <td>
                      <span className={`priority-tag ${p.priority?.toLowerCase()}`}>
                        {p.priority}
                      </span>
                    </td>
                    <td>
                      <div className="table-progress-wrap">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                        <span className="progress-pct-text">{p.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${p.status.toLowerCase().replace(' ', '-')}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dept-distribution-card">
          <div className="section-card-header">
            <h3>Workforce by Department</h3>
          </div>
          <DepartmentDistributionBar employees={employees} />
        </div>
      </div>
    </div>
  );
}

export default Reports;
