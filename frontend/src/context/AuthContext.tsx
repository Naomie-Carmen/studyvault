import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types/auth';
import { setClientAccessToken } from '../services/apiClient';
import * as authService from '../services/authService';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../../../backend/src/utils/validators';
import { AuthContext } from './AuthContextInstance';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateTokensAndUser = (newUser: User | null, newAccessToken: string | null) => {
    setUser(newUser);
    setAccessToken(newAccessToken);
    setClientAccessToken(newAccessToken);
  };

  const refreshSession = useCallback(async () => {
    try {
      const res = await authService.refresh();
      if (res.success && res.data) {
        updateTokensAndUser(res.data.user, res.data.accessToken);
      } else {
        updateTokensAndUser(null, null);
      }
    } catch (_err) {
      updateTokensAndUser(null, null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const handleLogin = async (data: LoginInput) => {
    setIsLoading(true);
    const res = await authService.login(data);
    setIsLoading(false);

    if (res.success && res.data) {
      updateTokensAndUser(res.data.user, res.data.accessToken);
      return { success: true };
    }

    return {
      success: false,
      error: res.error?.message || 'Identifiants invalides.',
    };
  };

  const handleRegister = async (data: RegisterInput) => {
    setIsLoading(true);
    const res = await authService.register(data);
    setIsLoading(false);

    if (res.success && res.data) {
      updateTokensAndUser(res.data.user, res.data.accessToken);
      return { success: true };
    }

    return {
      success: false,
      error: res.error?.message || 'Erreur lors de l\'inscription.',
    };
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await authService.logout();
    updateTokensAndUser(null, null);
    setIsLoading(false);
  };

  const handleForgotPassword = async (data: ForgotPasswordInput) => {
    const res = await authService.forgotPassword(data);
    if (res.success && res.data) {
      return { 
        success: true, 
        message: res.data.message, 
        debugToken: res.data.debugToken 
      };
    }
    return {
      success: false,
      error: res.error?.message || 'Impossible de traiter la demande.',
    };
  };

  const handleResetPassword = async (data: ResetPasswordInput) => {
    const res = await authService.resetPassword(data);
    if (res.success && res.data) {
      return { success: true, message: res.data.message };
    }
    return {
      success: false,
      error: res.error?.message || 'Erreur lors de la réinitialisation.',
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        forgotPassword: handleForgotPassword,
        resetPassword: handleResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
