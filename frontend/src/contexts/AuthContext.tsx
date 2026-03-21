import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../types/user";
import {
  loginApi,
  registerApi,
  getMe,
  refreshTokenApi,
} from "../api/auth";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    email?: string,
    full_name?: string
  ) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = "hlm_access_token";
const REFRESH_TOKEN_KEY = "hlm_refresh_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(ACCESS_TOKEN_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    navigate("/login");
  }, [clearAuth, navigate]);

  const refreshToken = useCallback(async () => {
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefresh) {
      clearAuth();
      return;
    }
    try {
      const res = await refreshTokenApi(storedRefresh);
      localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
      setToken(res.access_token);
      // Fetch updated user profile with the new token
      const updatedUser = await getMe(res.access_token);
      setUser(updatedUser);
    } catch {
      clearAuth();
    }
  }, [clearAuth]);

  // Validate stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    getMe(stored)
      .then((u) => {
        setUser(u);
        setToken(stored);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await loginApi(username, password);
      localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, res.refresh_token);
      setToken(res.access_token);
      setUser(res.user);
      navigate("/");
    },
    [navigate]
  );

  const register = useCallback(
    async (
      username: string,
      password: string,
      email?: string,
      full_name?: string
    ) => {
      const res = await registerApi({ username, password, email, full_name });
      localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, res.refresh_token);
      setToken(res.access_token);
      setUser(res.user);
      navigate("/");
    },
    [navigate]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
