import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" && window.localStorage.getItem("karmate_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        window.localStorage.removeItem("karmate_token");
      })
      .finally(() => setLoading(false));
  }, []);

  function saveSession({ token, user }) {
    window.localStorage.setItem("karmate_token", token);
    setUser(user);
  }

  function logout() {
    window.localStorage.removeItem("karmate_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
