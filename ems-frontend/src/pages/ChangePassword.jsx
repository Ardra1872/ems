import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldIcon } from '../components/common/Icons';
import './Login.css';

export function ChangePassword() {
  const { user, changePassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 12) {
      setError('Choose a password with at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword, confirmPassword);
      window.history.replaceState({}, '', '/');
    } catch (requestError) {
      setError(requestError.message || 'Could not update your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      window.history.replaceState({}, '', '/');
    } catch {
      setError('Could not sign out. Please try again.');
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="login-logo-badge"><ShieldIcon size={23} /></span>
          <span>ems<span className="login-brand-accent">flow</span></span>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">ONE LAST STEP</span>
          <h1>Set your password</h1>
          <p>Hi {user?.name}, create a new password to secure your account.</p>
        </div>

        <div className="password-change-note">
          Your temporary password can’t be used again after this step.
        </div>
        {error && <div className="login-error-alert" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 12 characters"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your new password again"
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Updating password...' : 'Save new password'}
          </button>
        </form>

        <button type="button" className="password-signout-button" onClick={handleSignOut}>
          Sign out instead
        </button>
      </section>
    </main>
  );
}

export default ChangePassword;
