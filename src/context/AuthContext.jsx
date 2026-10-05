import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, cacheUser, clearToken, getToken, readCachedUser, setToken } from '../api/client';

const AuthContext = createContext(null);

function samePhone(left, right) {
  return String(left || '').replace(/\D/g, '') === String(right || '').replace(/\D/g, '');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reopenAccount(cached) {
  if (!cached?.phone || !cached?.name) return null;
  try {
    const data = await api.login({ phone: cached.phone });
    setToken(data.token);
    cacheUser(data.user);
    return data.user;
  } catch (err) {
    if (err.status !== 404) return null;
  }
  try {
    const data = await api.register({ name: cached.name, phone: cached.phone });
    setToken(data.token);
    cacheUser(data.user);
    return data.user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restore() {
      const token = getToken();
      const cached = readCachedUser();
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      if (cached && active) setUser(cached);

      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const data = await api.me();
          if (!active) return;
          cacheUser(data.user);
          setUser(data.user);
          setLoading(false);
          return;
        } catch (err) {
          lastError = err;
          if (err.status === 401 || err.status === 404) break;
          await wait(700 * (attempt + 1));
        }
      }

      if (!active) return;
      if (lastError && (lastError.status === 401 || lastError.status === 404)) {
        const healed = await reopenAccount(cached);
        if (!active) return;
        if (healed) {
          setUser(healed);
        } else {
          clearToken();
          setUser(null);
        }
      }
      setLoading(false);
    }

    restore();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      async login(phone) {
        try {
          const data = await api.login({ phone });
          setToken(data.token);
          cacheUser(data.user);
          setUser(data.user);
          return data.user;
        } catch (err) {
          const cached = readCachedUser();
          if (err.status === 404 && cached?.name && samePhone(cached.phone, phone)) {
            const data = await api.register({ name: cached.name, phone });
            setToken(data.token);
            cacheUser(data.user);
            setUser(data.user);
            return data.user;
          }
          throw err;
        }
      },
      async register(name, phone) {
        const data = await api.register({ name, phone });
        setToken(data.token);
        cacheUser(data.user);
        setUser(data.user);
        return data.user;
      },
      logout() {
        clearToken();
        cacheUser(null);
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
