import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe storage wrapper to prevent quota or private mode errors from throwing unhandled exceptions
try {
  const testKey = '__cerebro_storage_test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
} catch (e) {
  console.warn('Storage is operating with memory fallback or restricted mode:', e);
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado no React App:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndRestore = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      if (typeof caches !== 'undefined') {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    } catch (e) {
      console.error("Erro ao limpar dados locais:", e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🧠</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '12px' }}>
            Calculadora Cérebro PDV
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '420px', lineHeight: '1.6', marginBottom: '28px' }}>
            O aplicativo precisa de uma rápida reinicialização. Selecione uma opção abaixo para continuar:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                padding: '14px 20px',
                fontSize: '15px',
                fontWeight: 'bold',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(56, 189, 248, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              🔄 Recarregar Página
            </button>

            <button
              onClick={this.handleClearCacheAndRestore}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '14px 20px',
                fontSize: '15px',
                fontWeight: 'bold',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🧹 Limpar Cache e Restaurar Sistema
            </button>
          </div>

          {this.state.error?.message && (
            <div style={{ marginTop: '32px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '12px', color: '#64748b', maxWidth: '400px', wordBreak: 'break-word' }}>
              Detalhes técnicos: {this.state.error.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </React.StrictMode>
  );
}
