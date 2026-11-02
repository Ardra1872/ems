import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardStats,
  getProjects,
  getTasks,
  getEmployees,
  getAttendance,
  punchClockIn,
  punchClockOut
} from '../services/api';
import {
  AttendanceTrendsChart,
  TaskCompletionDonut,
  DepartmentDistributionBar
} from '../components/common/Charts';
import {
  UsersIcon,
  ProjectsIcon,
  TasksIcon,
  AttendanceIcon,
  CheckCircleIcon,
  ClockIcon
} from '../components/common/Icons';
import './Dashboard.css';

export function Dashboard({ onNavigate }) {
  const { user, isEmployee } = useAuth();

  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashStats, projData, taskData, empData, attData] = await Promise.all([
        getDashboardStats(),
        getProjects(),
        getTasks(),
        getEmployees(),
        getAttendance()
      ]);
      setStats(dashStats);
      setProjects(projData);
      setTasks(taskData);
      setEmployees(empData);
      setAttendance(attData);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const userTodayAttendance = attendance.find(a => a.employee_id === user?.id && a.date === todayStr);

  const handleQuickClock = async () => {
    if (!userTodayAttendance?.check_in || userTodayAttendance.check_in === '-') {
      await punchClockIn(user.id, user.name, 'Office');
    } else {
      await punchClockOut(user.id);
    }
    loadData();
  };

  if (loading) {
    return (
      <div className="emp-loading-state">
        <p>Loading enterprise analytics dashboard...</p>
      </div>
    );
  }

  // Employee-specific portal view
  if (isEmployee) {
    const myTasks = tasks.filter(t => t.assignee_id === user?.id);
    const myCompleted = myTasks.filter(t => t.status === 'Completed').length;
    const myPending = myTasks.filter(t => t.status === 'Pending').length;
    const myInProgress = myTasks.filter(t => t.status === 'In Progress').length;
    const myProjects = projects.filter(project => (
      project.team_ids?.some(id => Number(id) === Number(user?.id))
    ));

    return (
      <div className="dashboard-page">
        {/* Welcome Banner */}
        <div className="employee-welcome-banner">
          <div>
            <h2>Hello, {user?.name}! 👋</h2>
            <p>Here is your daily work summary for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
          </div>
          <div className="quick-punch-box">
            <span className="punch-status-note">
              Status: {userTodayAttendance?.status || 'Not Clocked In'}
            </span>
            <button
              type="button"
              className={`btn-quick-punch ${userTodayAttendance?.check_in && (!userTodayAttendance?.check_out || userTodayAttendance?.check_out === '-') ? 'out' : 'in'}`}
              onClick={handleQuickClock}
            >
              <ClockIcon size={16} />
              {!userTodayAttendance?.check_in || userTodayAttendance?.check_in === '-'
                ? 'Clock In'
                : !userTodayAttendance?.check_out || userTodayAttendance?.check_out === '-'
                ? `Clock Out (${userTodayAttendance.check_in})`
                : 'Shift Completed ✓'}
            </button>
          </div>
        </div>

        {/* Employee Metric Cards */}
        <div className="stats-grid">
          <div className="stat-card" onClick={() => onNavigate('tasks')}>
            <div className="stat-info">
              <p>My Assigned Tasks</p>
              <h2>{myTasks.length}</h2>
              <span className="note-sub">{myPending} pending action</span>
            </div>
            <div className="stat-icon-wrapper blue">
              <TasksIcon size={22} />
            </div>
          </div>

          <div className="stat-card" onClick={() => onNavigate('tasks')}>
            <div className="stat-info">
              <p>Tasks In Progress</p>
              <h2>{myInProgress}</h2>
              <span className="note-sub">Active sprint items</span>
            </div>
            <div className="stat-icon-wrapper orange">
              <ClockIcon size={22} />
            </div>
          </div>

          <div className="stat-card" onClick={() => onNavigate('tasks')}>
            <div className="stat-info">
              <p>Completed Deliverables</p>
              <h2>{myCompleted}</h2>
              <span className="note-sub">{myTasks.length > 0 ? Math.round((myCompleted / myTasks.length) * 100) : 0}% completion</span>
            </div>
            <div className="stat-icon-wrapper green">
              <CheckCircleIcon size={22} />
            </div>
          </div>

          <div className="stat-card" onClick={() => onNavigate('projects')}>
            <div className="stat-info">
              <p>My Active Projects</p>
              <h2>{myProjects.length}</h2>
              <span className="note-sub">Linked squads</span>
            </div>
            <div className="stat-icon-wrapper purple">
              <ProjectsIcon size={22} />
            </div>
          </div>
        </div>

        {/* My Tasks Table & Projects */}
        <div className="emp-portal-grid">
          <div className="portal-section-card">
            <div className="section-card-header">
              <h3>My Recent Deliverables</h3>
              <button type="button" className="text-link-btn" onClick={() => onNavigate('tasks')}>
                View All Tasks →
              </button>
            </div>

            <div className="employee-table-container">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.slice(0, 5).map(task => (
                    <tr key={task.id}>
                      <td><strong>{task.title}</strong></td>
                      <td><span className="project-badge">{task.project_name}</span></td>
                      <td>{task.deadline || '—'}</td>
                      <td>
                        <span className={`status-pill ${task.status.toLowerCase().replace(' ', '-')}`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {myTasks.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                        No tasks currently assigned to you.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="portal-section-card">
            <div className="section-card-header">
              <h3>My Squad Projects</h3>
              <button type="button" className="text-link-btn" onClick={() => onNavigate('projects')}>
                View All →
              </button>
            </div>

            <div className="my-projects-list">
              {myProjects.map(proj => (
                <div key={proj.id} className="my-proj-item">
                  <div className="my-proj-top">
                    <strong>{proj.name}</strong>
                    <span className={`priority-tag ${proj.priority?.toLowerCase()}`}>{proj.priority}</span>
                  </div>
                  <p className="my-proj-desc">{proj.description}</p>
                  <div className="my-proj-progress">
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${proj.progress || 0}%` }} />
                    </div>
                    <span>{proj.progress}%</span>
                  </div>
                </div>
              ))}
              {myProjects.length === 0 && (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                  You are not yet linked to any project teams.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin & Manager Dashboard View
  return (
    <div className="dashboard-page">
      {/* 4 Primary KPI Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => onNavigate('employees')}>
          <div className="stat-info">
            <p>Employee Workforce</p>
            <h2>{stats?.totalEmployees || 0}</h2>
            <span className="note-sub text-green">
              {stats?.activeEmployees || 0} active ({stats?.inactiveEmployees || 0} inactive)
            </span>
          </div>
          <div className="stat-icon-wrapper blue">
            <UsersIcon size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('tasks')}>
          <div className="stat-info">
            <p>Task Completion Rate</p>
            <h2>{stats?.taskCompletionRate || 0}%</h2>
            <span className="note-sub text-blue">
              {stats?.completedTasks || 0} of {stats?.totalTasks || 0} completed
            </span>
          </div>
          <div className="stat-icon-wrapper green">
            <CheckCircleIcon size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('attendance')}>
          <div className="stat-info">
            <p>Today's Attendance Rate</p>
            <h2>{stats?.attendanceRate || 0}%</h2>
            <span className="note-sub text-orange">
              {stats?.presentToday || 0} employees checked in
            </span>
          </div>
          <div className="stat-icon-wrapper orange">
            <AttendanceIcon size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('projects')}>
          <div className="stat-info">
            <p>Active Projects</p>
            <h2>{stats?.activeProjects || 0}</h2>
            <span className="note-sub text-purple">
              {stats?.totalProjects || 0} total initiatives
            </span>
          </div>
          <div className="stat-icon-wrapper purple">
            <ProjectsIcon size={24} />
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="dashboard-charts-grid">
        {/* Attendance Trends Bar/Column Chart */}
        <div className="chart-container-card trends-card">
          <AttendanceTrendsChart data={stats?.weeklyTrends} />
        </div>

        {/* Task Completion Donut Chart */}
        <div className="chart-container-card donut-card">
          <h3 className="chart-card-title">Task Distribution</h3>
          <TaskCompletionDonut
            pending={stats?.pendingTasks || 0}
            inProgress={stats?.inProgressTasks || 0}
            completed={stats?.completedTasks || 0}
          />
        </div>
      </div>

      {/* Secondary Analytics Row: Department Headcount & Project Summaries */}
      <div className="dashboard-bottom-grid">
        {/* Project Summaries */}
        <div className="project-summaries-card">
          <div className="section-card-header">
            <div>
              <h3>Project Progress Summaries</h3>
              <p>Key delivery milestones, progress velocity and leads</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('projects')}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              All Projects ({projects.length})
            </button>
          </div>

          <div className="employee-table-container">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Manager / Lead</th>
                  <th>Delivery Progress</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(proj => (
                  <tr key={proj.id}>
                    <td>
                      <strong>{proj.name}</strong>
                      <span className="emp-email-sub">{proj.client}</span>
                    </td>
                    <td>
                      <div className="assignee-cell">
                        <span className="assignee-avatar">
                          {(proj.manager_name || 'M').slice(0, 2).toUpperCase()}
                        </span>
                        <span>{proj.manager_name}</span>
                      </div>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div className="table-progress-wrap">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${proj.progress || 0}%` }}
                          />
                        </div>
                        <span className="progress-pct-text">{proj.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="task-date">{proj.deadline || 'Ongoing'}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${proj.status.toLowerCase().replace(' ', '-')}`}>
                        {proj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="dept-distribution-card">
          <div className="section-card-header">
            <div>
              <h3>Department Breakdown</h3>
              <p>Staff count per division</p>
            </div>
          </div>
          <DepartmentDistributionBar employees={employees} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
