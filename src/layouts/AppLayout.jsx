import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

function NavIcon({ name }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (name === 'dashboard') {
    return (
      <svg {...props}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (name === 'system') {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    );
  }
  if (name === 'skills') {
    return (
      <svg {...props}>
        <path d="M4 19V6.5A1.5 1.5 0 0 1 5.5 5H18" />
        <path d="M8 19V9" />
        <path d="M12 19V9" />
        <path d="M16 19v-6" />
      </svg>
    );
  }
  if (name === 'projects') {
    return (
      <svg {...props}>
        <path d="M4 8.5h16v10.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5z" />
        <path d="M4 8.5 6.2 5.5A1 1 0 0 1 7 5h10a1 1 0 0 1 .8.4L20 8.5" />
      </svg>
    );
  }
  if (name === 'gates') {
    return (
      <svg {...props}>
        <path d="M12 3.5 20 7.5v5.2c0 4.2-3.1 6.8-8 8.3-4.9-1.5-8-4.1-8-8.3V7.5L12 3.5z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (name === 'progress') {
    return (
      <svg {...props}>
        <path d="M4 16.5 9 11l3.5 3.5L20 7" />
        <path d="M14.5 7H20v5.5" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" />
    </svg>
  );
}

const NAV_GROUPS = [
  {
    label: 'Learning',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/skill-system', label: 'Skill System', icon: 'system', end: true },
      { to: '/skills', label: 'Skills', icon: 'skills', end: true },
      { to: '/projects', label: 'Projects', icon: 'projects', end: true },
    ],
  },
  {
    label: 'Tracking',
    items: [
      { to: '/skill-progress', label: 'Skill Progress', icon: 'progress', end: true },
      { to: '/gates', label: 'Gates', icon: 'gates', end: true },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: 'settings', end: true },
    ],
  },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'd') navigate('/');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const isSkillSystem = ['/skill-system', '/skills', '/projects', '/gates'].includes(location.pathname);

  return (
    <div className={`app-shell${isSkillSystem ? ' skill-system-open' : ''}`}>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">DS</span>
          <div>
            <h2>Data Science</h2>
            <span>Study plan</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-link-icon"><NavIcon name={item.icon} /></span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-account">
            <span className="sidebar-avatar">{initials}</span>
            <div>
              <strong>{user?.name}</strong>
              <button className="sidebar-logout" onClick={handleLogout}>Log out</button>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-body">
        <header className="mobile-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" aria-expanded={sidebarOpen}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <strong style={{ color: 'var(--text)', letterSpacing: '-0.02em', fontSize: 14 }}>Data Science</strong>
          <span style={{ width: 36 }} />
        </header>

        <main className={`app-main${isSkillSystem ? ' app-main-flush' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className={`page-transition${isSkillSystem ? ' page-transition-flush' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
