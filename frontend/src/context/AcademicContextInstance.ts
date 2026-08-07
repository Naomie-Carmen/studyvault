import { createContext } from 'react';
import { AcademicProfile } from '../types/academic';
import { AcademicProfileInput } from '../../../backend/src/utils/validators';

export interface AcademicContextType {
  profile: AcademicProfile | null;
  isLoading: boolean;
  hasConfiguredProfile: boolean;
  universities: string[];
  saveProfile: (data: AcademicProfileInput) => Promise<{ success: boolean; error?: string }>;
  toggleSemester: (semesterId: string, isActive: boolean) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AcademicContext = createContext<AcademicContextType | undefined>(undefined);
