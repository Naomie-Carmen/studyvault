import { useContext } from 'react';
import { AcademicContext, AcademicContextType } from './AcademicContextInstance';

export const useAcademic = (): AcademicContextType => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic doit être utilisé au sein d\'un AcademicProvider');
  }
  return context;
};
