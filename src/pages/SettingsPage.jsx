import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Preferences and account</p>
        </div>
      </div>

      <div className="card settings-group">
        <h3>Account</h3>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">{user?.name}</div>
            <div className="settings-row-desc">{user?.phone}</div>
          </div>
        </div>
      </div>

      <div className="card settings-group">
        <h3>Appearance</h3>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Dark mode</div>
            <div className="settings-row-desc">Switch between light and dark theme</div>
          </div>
          <button
            className={`toggle-switch ${darkMode ? 'on' : ''}`}
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          />
        </div>
      </div>

      <div className="card settings-group">
        <h3>Keyboard shortcuts</h3>
        <ul className="shortcut-list">
          <li><span>Go to Dashboard</span><kbd>d</kbd></li>
        </ul>
      </div>

      <div className="card settings-group">
        <button
          className="btn-secondary"
          style={{ width: '100%' }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
