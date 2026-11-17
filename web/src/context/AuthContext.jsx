import { createContext, useCallback, useEffect, useState } from "react";
import { AuthService } from "../services/AuthService";
import { readSession, saveSession, clearSession } from "../services/session";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [loading, setLoading] = useState(() => Boolean(readSession()?.token));
  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setLoading(false);
  }, []);
  const signIn = useCallback((value) => {
    saveSession(value);
    setSession(value);
  }, []);
  const updateUser = useCallback((usuario) => {
    setSession((current) => {
      if (!current) return null;
      const next = { ...current, usuario };
      saveSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("miniaula:unauthorized", logout);
    return () => window.removeEventListener("miniaula:unauthorized", logout);
  }, [logout]);

  const token = session?.token;
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    AuthService.me(controller.signal).then(updateUser).catch(() => {
      // Los 401 ya cierran sesión en el interceptor. Un fallo de red permite reintentar.
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [token, updateUser]);

  return <AuthContext.Provider value={{
    user: session?.usuario || null, loading, signIn, logout, updateUser,
  }}>{children}</AuthContext.Provider>;
}
