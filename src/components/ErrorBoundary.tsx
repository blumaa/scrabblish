import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          padding: '24px',
          fontFamily: 'system-ui',
          color: '#e2dfd8',
          background: '#1e1d22',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Something went wrong</h1>
          <p style={{ fontSize: '14px', color: '#8a8680', marginBottom: '24px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              background: '#5a7a9e',
              color: '#e2dfd8',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
