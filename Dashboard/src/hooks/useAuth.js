import { useState, useEffect, useCallback } from "react";

/**
 * useAuth — manages authentication state for AI Saathi.
 *
 * Returns:
 *   user    — the authenticated user object, or null
 *   loading — true while the initial session check is in progress
 *   error   — any error from the session check
 *   logout  — async function that calls /auth/logout and clears state
 *   refresh — force re-check the session (call after OAuth redirect)
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkSession = useCallback(() => {
    setLoading(true);
    fetch("/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setUser(null);
        setLoading(false);
      });
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const logout = useCallback(async () => {
    try {
      await fetch("/auth/logout", { credentials: "include" });
    } catch {
      // swallow network errors — we still clear local state
    }
    setUser(null);
    setError(null);
  }, []);

  return { user, loading, error, logout, refresh: checkSession };
}
