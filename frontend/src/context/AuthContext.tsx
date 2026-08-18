import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types/auth';
import { setClientAccessToken } from '../services/apiClient';
import * as authService from '../services/authService';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../types/validators';
import { AuthContext } from './AuthContextInstance';

const ACCESS_TOKEN_KEY = 'studyvault_access_token';
const REFRESH_TOKEN_KEY = 'studyvault_refresh_token';

function readStoredToken(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch (_err) {
    return null;
  }
}

function persistToken(key: string, value: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch (_err) {
    // Storage unavailable (private mode, etc.)
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateTokensAndUser = useCallback((newUser: User | null, newAccessToken: string | null, newRefreshToken?: string | null) => {
    setUser(newUser);
    setAccessToken(newAccessToken);
    setClientAccessToken(newAccessToken);
    persistToken(ACCESS_TOKEN_KEY, newAccessToken);
    if (newRefreshToken !== undefined) {
      persistToken(REFRESH_TOKEN_KEY, newRefreshToken);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const storedRefreshToken = readStoredToken(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        console.log('[AuthContext] Aucun refresh token dans le localStorage.');
        updateTokensAndUser(null, null, null);
        return;
      }

      console.log('[AuthContext] Tentative de rafraîchissement de la session 7j...');
      const res = await authService.refresh(storedRefreshToken);
      if (res.success && res.data) {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: refreshedUser } = res.data;
        
        console.log('[AuthContext] Session rafraîchie avec succès.');
        setClientAccessToken(newAccessToken);
        persistToken(ACCESS_TOKEN_KEY, newAccessToken);
        if (newRefreshToken) {
          persistToken(REFRESH_TOKEN_KEY, newRefreshToken);
        }
        setAccessToken(newAccessToken);

        // Charger le profil utilisateur le plus récent via GET /users/me
        const meRes = await authService.getMe();
        if (meRes.success && meRes.data) {
          console.log('[AuthContext] Profil utilisateur restauré :', meRes.data.email);
          setUser(meRes.data);
        } else if (refreshedUser) {
          console.log('[AuthContext] Profil secours restauré :', refreshedUser.email);
          setUser(refreshedUser);
        } else {
          console.warn('[AuthContext] Échec de la récupération du profil utilisateur.');
          updateTokensAndUser(null, null, null);
        }
      } else {
        console.warn('[AuthContext] Le jeton de rafraîchissement est invalide ou expiré :', res.error?.message);
        updateTokensAndUser(null, null, null);
      }
    } catch (err) {
      console.error('[AuthContext] Erreur critique lors du rafraîchissement de session :', err);
      updateTokensAndUser(null, null, null);
    } finally {
      setIsLoading(false);
    }
  }, [updateTokensAndUser]);

  useEffect(() => {
    const storedAccessToken = readStoredToken(ACCESS_TOKEN_KEY);
    if (storedAccessToken) {
      setClientAccessToken(storedAccessToken);
    }
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('[AuthContext] Événement 401 studyvault:unauthorized reçu, réinitialisation de la session.');
      updateTokensAndUser(null, null, null);
    };

    window.addEventListener('studyvault:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('studyvault:unauthorized', handleUnauthorized);
    };
  }, [updateTokensAndUser]);

  const handleLogin = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const res = await authService.login(data);
      if (res.success && res.data) {
        console.log('[AuthContext] Connexion réussie. Stockage des jetons 7 jours.');
        updateTokensAndUser(res.data.user, res.data.accessToken, res.data.refreshToken);
        return { success: true };
      }
      return {
        success: false,
        error: res.error?.message || 'Identifiants invalides.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      if (res.success && res.data) {
        console.log('[AuthContext] Inscription réussie. Stockage des jetons 7 jours.');
        updateTokensAndUser(res.data.user, res.data.accessToken, res.data.refreshToken);
        return { success: true };
      }
      return {
        success: false,
        error: res.error?.message || 'Erreur lors de l\'inscription.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    const storedRefreshToken = readStoredToken(REFRESH_TOKEN_KEY);
    // Vider immédiatement l'état et localStorage
    updateTokensAndUser(null, null, null);

    if (storedRefreshToken) {
      try {
        await authService.logout(storedRefreshToken);
      } catch (_err) {
        // Ignorer l'erreur réseau éventuelle à la déconnexion
      }
    }
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
        refreshSession,
        forgotPassword: handleForgotPassword,
        resetPassword: handleResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
