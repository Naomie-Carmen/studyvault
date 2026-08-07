import { useContext } from 'react';
import { AuthContext, AuthContextType } from './AuthContextInstance';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé au sein d\'un AuthProvider');
  }
  return context;
};
