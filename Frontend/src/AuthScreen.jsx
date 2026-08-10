import { useState } from 'react';
import './Auth.css';

const initialSignup = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function AuthScreen({ api, onAuthenticated }) {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('resetToken');

  const [mode, setMode] = useState(resetToken ? 'reset' : 'login');
  const [login, setLogin] = useState({ identifier: '', password: '' });
  const [signup, setSignup] = useState(initialSignup);
  const [email, setEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: login.identifier,
        password: login.password
      });
      onAuthenticated(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to log in. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async (e) => {
    e.preventDefault();
    clearMessages();

    if (signup.password !== signup.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!signup.email && !signup.phone) {
      setError('Enter an email address or phone number.');
      return;
    }
    if (signup.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: signup.name,
        email: signup.email || null,
        phone: signup.phone || null,
        password: signup.password
      });
      onAuthenticated(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data?.message || 'If the account exists, a reset link has been sent.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send the reset email.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!resetToken) {
      setError('The password reset link is missing.');
      return;
    }
    if (resetPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        resetToken,
        password: resetPassword
      });
      setMessage(response.data?.message || 'Password reset successfully.');
      setMode('login');
      window.history.replaceState({}, document.title, window.location.pathname);
      setLogin({ identifier: '', password: '' });
    } catch (err) {
      setError(err?.response?.data?.message || 'This reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Welcome back' :
    mode === 'signup' ? 'Create your ERP account' :
    mode === 'forgot' ? 'Forgot your password?' : 'Set a new password';

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-logo">B</div>
        <div>
          <h1>Badal ERP</h1>
          <p>Business Management System</p>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-heading">
          <h2>{title}</h2>
          <p>
            {mode === 'login' && 'Sign in to manage your business.'}
            {mode === 'signup' && 'Create your account to get started.'}
            {mode === 'forgot' && 'Enter your email and we will send a secure reset link.'}
            {mode === 'reset' && 'Choose a strong password for your account.'}
          </p>
        </div>

        {message && <div className="auth-message success">{message}</div>}
        {error && <div className="auth-message error">{error}</div>}

        {mode === 'login' && (
          <form onSubmit={submitLogin} className="auth-form">
            <label>Email or phone<input value={login.identifier} onChange={(e) => setLogin({ ...login, identifier: e.target.value })} required autoComplete="username" /></label>
            <label>Password<input type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} required autoComplete="current-password" /></label>
            <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
            <button type="button" className="auth-link-button" onClick={() => { clearMessages(); setMode('forgot'); }}>Forgot password?</button>
            <div className="auth-divider"><span>New to Badal ERP?</span></div>
            <button type="button" className="auth-secondary" onClick={() => { clearMessages(); setMode('signup'); }}>Create account</button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={submitSignup} className="auth-form">
            <label>Full name<input value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} required autoComplete="name" /></label>
            <label>Email<input type="email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} autoComplete="email" /></label>
            <label>Phone<input value={signup.phone} onChange={(e) => setSignup({ ...signup, phone: e.target.value })} autoComplete="tel" /></label>
            <p className="auth-hint">Enter at least an email or phone number.</p>
            <label>Password<input type="password" minLength="8" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} required autoComplete="new-password" /></label>
            <label>Confirm password<input type="password" minLength="8" value={signup.confirmPassword} onChange={(e) => setSignup({ ...signup, confirmPassword: e.target.value })} required autoComplete="new-password" /></label>
            <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Sign up'}</button>
            <button type="button" className="auth-link-button" onClick={() => { clearMessages(); setMode('login'); }}>Already have an account? Login</button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={submitForgot} className="auth-form">
            <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
            <button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
            <button type="button" className="auth-link-button" onClick={() => { clearMessages(); setMode('login'); }}>Back to login</button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={submitReset} className="auth-form">
            <label>New password<input type="password" minLength="8" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required autoComplete="new-password" /></label>
            <label>Confirm new password<input type="password" minLength="8" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} required autoComplete="new-password" /></label>
            <button type="submit" disabled={loading}>{loading ? 'Updating…' : 'Reset password'}</button>
            <button type="button" className="auth-link-button" onClick={() => { clearMessages(); setMode('login'); }}>Back to login</button>
          </form>
        )}
      </div>

      <p className="auth-footer">Secure account access • Your password is encrypted before storage.</p>
    </div>
  );
}
