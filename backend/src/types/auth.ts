export interface AuthUserPayload {
  id: string;
  email: string;
  fullName: string;
  role?: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  university?: string | null;
  program?: string | null;
  level?: string | null;
  role?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSuccessData {
  user: UserProfileResponse;
  accessToken: string;
}