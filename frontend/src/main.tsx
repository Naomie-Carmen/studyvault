import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { AcademicProvider } from './context/AcademicContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AcademicProvider>
          <App />
        </AcademicProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);