import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ArtisanUser, AuthContextType, RegisterPayload, LoginPayload } from '../types/auth.js';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getStoredToken,
  setStoredTokens,
} from '../services/authService.js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ArtisanUser | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  // Restore authenticated artisan state on mount or page refresh
  useEffect(() => {
    async function initAuth() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const artisan = await getCurrentUser();
        setUser(artisan);
        setToken(storedToken);
      } catch (err) {
        // Token invalid or expired without valid refresh token
        setStoredTokens(null, null);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const register = async (payload: RegisterPayload) => {
    const result = await registerUser(payload);
    if (result.artisan && result.accessToken) {
      setUser(result.artisan);
      setToken(result.accessToken);
    }
    return { m63Id: result.m63Id, artisan: result.artisan };
  };

  const login = async (payload: LoginPayload) => {
    const artisan = await loginUser(payload);
    setUser(artisan);
    setToken(getStoredToken());
    return artisan;
  };

  const logout = async () => {
    try {
      // Clear all session draft keys from localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('m63_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      // Ignore storage errors
    }

    await logoutUser();
    setUser(null);
    setToken(null);
  };

  const refreshProfile = async () => {
    try {
      const artisan = await getCurrentUser();
      setUser(artisan);
    } catch (err) {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
