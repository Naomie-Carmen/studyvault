import React, { useState, useEffect, useCallback } from 'react';
import { AcademicProfile } from '../types/academic';
import * as academicService from '../services/academicService';
import { AcademicProfileInput } from '../types/validators';
import { AcademicContext } from './AcademicContextInstance';
import { useAuth } from './useAuth';

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [universities, setUniversities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [profRes, univRes] = await Promise.all([
        academicService.getProfile(),
        academicService.getUniversities(),
      ]);

      if (profRes.success && profRes.data) {
        setProfile(profRes.data);
      } else {
        setProfile(null);
      }

      if (univRes.success && univRes.data) {
        setUniversities(univRes.data);
      }
    } catch (_err) {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async (data: AcademicProfileInput) => {
    setIsLoading(true);
    const res = await academicService.updateProfile(data);
    setIsLoading(false);

    if (res.success && res.data) {
      setProfile(res.data);
      return { success: true };
    }

    return {
      success: false,
      error: res.error?.message || 'Impossible d\'enregistrer le profil universitaire.',
    };
  };

  const toggleSemester = async (semesterId: string, isActive: boolean) => {
    const res = await academicService.patchSemester(semesterId, isActive);
    if (res.success && profile && profile.academicYear) {
      const updatedSemesters = profile.academicYear.semesters.map((s) =>
        s.id === semesterId ? { ...s, isActive } : s
      );
      setProfile({
        ...profile,
        academicYear: {
          ...profile.academicYear,
          semesters: updatedSemesters,
        },
      });
    }
  };

  return (
    <AcademicContext.Provider
      value={{
        profile,
        isLoading,
        hasConfiguredProfile: !!profile?.isConfigured,
        universities,
        saveProfile,
        toggleSemester,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};
