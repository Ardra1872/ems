import { createContext, useState, useEffect, useCallback } from 'react';
import { loginUser, getCurrentUser, logoutUser, changePassword as updatePassword } from '../services/api';

export { useAuth } from './useAuth';
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Clear any legacy test mock stores so we only use the database
  useEffect(() => {
    try {
      localStorage.removeItem('ems_employees');
      localStorage.removeItem('ems_projects');
      localStorage.removeItem('ems_tasks');
      localStorage.removeItem('ems_attendance');
      localStorage.removeItem('ems_leaves');
      localStorage.removeItem('ems_current_user');
      localStorage.removeItem('ems_auth_version');
    } catch {
      // ignore
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      setUser(await getCurrentUser());
    } catch (error) {
      setUser(null);
      if (error.status !== 401) {
        setAuthError(error.message || 'Could not verify your session.');
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email, password) => {
    try {
      const res = await loginUser(email, password);
      if (res && res.user) {
        setUser(res.user);
        setAuthError('');
        return { success: true, user: res.user };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (err) {
      console.error('Database Login Error:', err);
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const changeUserPassword = async (newPassword, confirmPassword) => {
    const updatedUser = await updatePassword(newPassword, confirmPassword);
    setUser(updatedUser);
    return updatedUser;
  };

  const role = user?.role || 'guest';
  const isAuthenticated = !!user;

  // Role permissions
  const canManageEmployees = role === 'admin';
  const canCreateProjects = role === 'admin' || role === 'manager';
  const canAssignTasks = role === 'admin' || role === 'manager';
  const canApproveLeaves = role === 'admin' || role === 'manager';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        authLoading,
        authError,
        refreshSession,
        login,
        logout,
        changePassword: changeUserPassword,
        canManageEmployees,
        canCreateProjects,
        canAssignTasks,
        canApproveLeaves,
        isAdmin,
        isManager,
        isEmployee
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
