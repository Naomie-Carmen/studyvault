import { createContext } from 'react';
import { AuthState } from '../types/auth';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../../../backend/src/utils/validators';

export interface AuthContextType extends AuthState {
  login: (data: LoginInput) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordInput) => Promise<{ success: boolean; message?: string; debugToken?: string; error?: string }>;
  resetPassword: (data: ResetPasswordInput) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
