import { Navigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { LoginScreen } from '../screens/LoginScreen';

export function LoginRoute() {
  const { user, loading, error, signIn, signUp, resetPassword, clearError } = useAuth();

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <LoginScreen
      onSignIn={signIn}
      onSignUp={signUp}
      onResetPassword={resetPassword}
      error={error}
      loading={loading}
      onClearError={clearError}
    />
  );
}
