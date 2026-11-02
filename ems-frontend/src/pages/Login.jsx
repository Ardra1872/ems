import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldIcon, CheckCircleIcon } from '../components/common/Icons';
import './Login.css';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message || 'Invalid credentials. Please try again.');
      } else {
        window.history.replaceState({}, '', '/');
      }
    } catch {
      setError('Connection to backend database failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <a className="login-back-link" href="/">Back to home</a>
      <section className="login-card">
        <a className="login-brand" href="/" aria-label="EMS home">
          <span className="login-logo-badge"><ShieldIcon size={23} /></span>
          <span>ems<span className="login-brand-accent">flow</span></span>
        </a>

        <div className="login-heading">
          <span className="login-eyebrow">YOUR WORKSPACE, IN SYNC</span>
          <h1>Welcome back</h1>
          <p>Sign in with your work account to continue.</p>
        </div>

        {error && <div className="login-error-alert" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="form-group">
            <div className="label-with-link">
              <label htmlFor="password">Password</label>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="login-footer-info">
          <CheckCircleIcon size={15} className="check-icon" />
          <span>Your access is managed securely by your organization.</span>
        </div>
      </section>
      <p className="login-help">Need access? Contact your EMS administrator.</p>
    </main>
  );
}

export default Login;
