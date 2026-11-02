import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  UsersIcon,
  ProjectsIcon,
  TasksIcon,
  AttendanceIcon,
  ReportsIcon,
  LogOutIcon,
  ShieldIcon
} from './common/Icons';
import './Sidebar.css';

export function Sidebar({ currentTab, setCurrentTab }) {
  const { user, role, logout, isAdmin, isEmployee } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: isEmployee ? 'My Dashboard' : 'Dashboard',
      icon: <DashboardIcon size={18} />,
      roles: ['admin', 'manager', 'employee']
    },
    {
      id: 'employees',
      label: isAdmin ? 'Employees (CRUD)' : 'Employee Directory',
      icon: <UsersIcon size={18} />,
      roles: ['admin', 'manager', 'employee']
    },
    {
      id: 'projects',
      label: isEmployee ? 'My Projects' : 'Projects & Teams',
      icon: <ProjectsIcon size={18} />,
      roles: ['admin', 'manager', 'employee']
    },
    {
      id: 'tasks',
      label: isEmployee ? 'My Tasks' : 'Task Management',
      icon: <TasksIcon size={18} />,
      roles: ['admin', 'manager', 'employee']
    },
    {
      id: 'attendance',
      label: isEmployee ? 'My Attendance & Leave' : 'Attendance & Leave',
      icon: <AttendanceIcon size={18} />,
      roles: ['admin', 'manager', 'employee']
    },
    {
      id: 'reports',
      label: isAdmin ? 'Reports & Analytics' : 'Scoped Reports',
      icon: <ReportsIcon size={18} />,
      roles: ['admin', 'manager']
    }
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <ShieldIcon size={22} />
        </div>
        <div className="sidebar-brand-text">
          <h2>EMS<span>.PRO</span></h2>
          <span className="brand-tagline">Enterprise Suite</span>
        </div>
      </div>

      <div className="role-pill-badge">
        <span className={`role-dot ${role}`}></span>
        <span className="role-text">{role.toUpperCase()} ACCESS</span>
      </div>

      <p className="menu-label">WORKSPACE</p>

      <nav className="sidebar-nav">
        {filteredNav.map(item => (
          <button
            key={item.id}
            type="button"
            className={`nav-link-btn ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => setCurrentTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-mini-card">
          <div className="user-mini-avatar">
            {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
          </div>
          <div className="user-mini-info">
            <span className="user-mini-name">{user?.name || 'User'}</span>
            <span className="user-mini-role">{user?.designation || role}</span>
          </div>
          <button
            type="button"
            className="logout-mini-btn"
            onClick={() => logout().catch(() => window.alert('Could not sign out. Please try again.'))}
            title="Sign Out"
          >
            <LogOutIcon size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
