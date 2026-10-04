import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(phone);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-kicker">24-MONTH SYSTEM</p>
        <h1>Data Science<span>Study Plan</span></h1>
        <p className="subtitle">Enter your phone number to continue</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            required
            autoComplete="tel"
          />
          <button className="auth-btn" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Enter'}
          </button>
        </form>
        <p className="auth-link">
          New here? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
