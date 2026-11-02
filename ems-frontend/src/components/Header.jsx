import { useAuth } from '../context/AuthContext';
import { CalendarIcon, LogOutIcon } from './common/Icons';
import './Header.css';

export function Header({ currentTab }) {
  const { user, role, logout } = useAuth();

  const tabTitles = {
    dashboard: {
      title: role === 'employee' ? 'My Workplace Portal' : 'Executive Dashboard',
      subtitle: role === 'employee' ? `Welcome back, ${user?.name}! Here is your daily productivity summary.` : "System overview, active workforce metrics and operational KPIs."
    },
    employees: {
      title: role === 'admin' ? 'Employee Management' : 'Employee Directory',
      subtitle: role === 'admin' ? 'Add, edit, deactivate and monitor staff records across departments.' : 'Browse team contacts, designations, and departmental structures.'
    },
    projects: {
      title: 'Projects & Teams',
      subtitle: 'Organize multidisciplinary squads, assign project leads, and track milestones.'
    },
    tasks: {
      title: role === 'employee' ? 'My Assigned Tasks' : 'Task Operations',
      subtitle: role === 'employee' ? 'Track your deliverables, pending actions, and completion status.' : 'Assign tasks, establish deadlines, and balance team bandwidth.'
    },
    attendance: {
      title: 'Attendance & Leave Management',
      subtitle: 'Daily check-in logs, work hours tracking, and leave application approvals.'
    },
    reports: {
      title: 'Analytics & Strategic Reports',
      subtitle: 'Workforce trends, project completion velocity, and operational statistics.'
    }
  };

  const currentInfo = tabTitles[currentTab] || {
    title: 'EMS Portal',
    subtitle: 'Enterprise Management System'
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="header">
      <div className="header-titles">
        <h2>{currentInfo.title}</h2>
        <p>{currentInfo.subtitle}</p>
      </div>

      <div className="header-right">
        <div className="header-date-badge">
          <CalendarIcon size={15} />
          <span>{todayStr}</span>
        </div>

        <div className="header-profile">
          <div className="avatar">
            {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
          </div>
          <div className="profile-details">
            <strong className="profile-name">{user?.name}</strong>
            <span className="profile-role-tag">{user?.designation || role}</span>
          </div>
          <button
            type="button"
            className="header-logout-btn"
            onClick={() => logout().catch(() => window.alert('Could not sign out. Please try again.'))}
            title="Sign out of EMS"
          >
            <LogOutIcon size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
