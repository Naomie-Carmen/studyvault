import { fetchApi } from './apiClient';
import { ApiResponse } from '../types/api';
import { AuthSuccessPayload, User } from '../types/auth';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../types/validators';

export async function register(data: RegisterInput): Promise<ApiResponse<AuthSuccessPayload>> {
  return fetchApi<AuthSuccessPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginInput): Promise<ApiResponse<AuthSuccessPayload>> {
  return fetchApi<AuthSuccessPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refresh(): Promise<ApiResponse<AuthSuccessPayload>> {
  return fetchApi<AuthSuccessPayload>('/auth/refresh', {
    method: 'POST',
  });
}

export async function logout(): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export async function forgotPassword(data: ForgotPasswordInput): Promise<ApiResponse<{ message: string; debugToken?: string }>> {
  return fetchApi<{ message: string; debugToken?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: ResetPasswordInput): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<ApiResponse<User>> {
  return fetchApi<User>('/users/me', {
    method: 'GET',
  });
}
