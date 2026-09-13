import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ArtisanUser,
  CustomerProfile,
  AuthContextType,
  RegisterPayload,
  CustomerRegisterPayload,
  LoginPayload,
  CustomerLoginPayload,
} from '../types/auth.js';
import {
  registerUser,
  loginUser,
  registerCustomerUser,
  loginCustomerUser,
  updateCustomerProfileData,
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

  // Restore authenticated user state on mount or page refresh
  useEffect(() => {
    async function initAuth() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setToken(storedToken);
        } else {
          setStoredTokens(null, null);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
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
      setUser({ ...result.artisan, role: 'ARTISAN' });
      setToken(result.accessToken);
    }
    return { m63Id: result.m63Id, artisan: { ...result.artisan, role: 'ARTISAN' as const } };
  };

  const login = async (payload: LoginPayload) => {
    const artisan = await loginUser(payload);
    const userObj = { ...artisan, role: 'ARTISAN' as const };
    setUser(userObj);
    setToken(getStoredToken());
    return userObj;
  };

  const registerCustomer = async (payload: CustomerRegisterPayload) => {
    const customerUser = await registerCustomerUser(payload);
    const userObj = { ...customerUser, role: 'CUSTOMER' as const };
    setUser(userObj);
    setToken(getStoredToken());
    return userObj;
  };

  const loginCustomer = async (payload: CustomerLoginPayload) => {
    const customerUser = await loginCustomerUser(payload);
    const userObj = { ...customerUser, role: 'CUSTOMER' as const };
    setUser(userObj);
    setToken(getStoredToken());
    return userObj;
  };

  const updateCustomerProfile = async (payload: Partial<CustomerProfile>) => {
    const updated = await updateCustomerProfileData(payload);
    const userObj = { ...user, ...updated, role: 'CUSTOMER' as const };
    setUser(userObj);
    return userObj;
  };

  const logout = async () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('m63_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}

    await logoutUser();
    setUser(null);
    setToken(null);
  };

  const refreshProfile = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) setUser(currentUser);
    } catch (err) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        registerCustomer,
        loginCustomer,
        updateCustomerProfile,
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
