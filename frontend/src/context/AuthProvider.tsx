// Backward-compatible alias: the canonical provider lives in AuthContext.tsx.
// Kept so that any import of './context/AuthProvider' resolves to the same
// implementation (persistent session via localStorage tokens).
export { AuthProvider } from './AuthContext';
