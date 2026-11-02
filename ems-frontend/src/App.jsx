import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import './App.css';

function MainLayout() {
  const { isAuthenticated, user, role, authLoading, authError, refreshSession } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (authLoading) {
    return <div className="auth-loading-screen">Checking your secure session...</div>;
  }

  if (authError) {
    return (
      <div className="auth-loading-screen auth-error-screen" role="alert">
        <p>{authError}</p>
        <button type="button" onClick={refreshSession}>Try again</button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return window.location.pathname === '/login' ? <Login /> : <Landing />;
  }

  if (user.must_change_password) {
    return <ChangePassword />;
  }

  // Guard unauthorized tabs
  const activeTab = (role === 'employee' && currentTab === 'reports') ? 'dashboard' : currentTab;

  return (
    <div className="app-layout">
      <Sidebar currentTab={activeTab} setCurrentTab={setCurrentTab} />

      <main className="main-content">
        <Header currentTab={activeTab} />

        <section className="dashboard-content">
          {activeTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
          {activeTab === 'employees' && <Employees />}
          {activeTab === 'projects' && <Projects />}
          {activeTab === 'tasks' && <Tasks />}
          {activeTab === 'attendance' && <Attendance />}
          {activeTab === 'reports' && <Reports />}
        </section>
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
