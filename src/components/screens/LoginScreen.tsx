import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Spinner } from '../atoms/Spinner';
import './LoginScreen.css';

interface LoginScreenProps {
  onSignIn: (email: string, password: string) => Promise<boolean>;
  onSignUp: (email: string, password: string, username: string) => Promise<boolean>;
  onResetPassword: (email: string) => Promise<boolean>;
  error: string | null;
  loading: boolean;
  onClearError: () => void;
}

export function LoginScreen({
  onSignIn,
  onSignUp,
  onResetPassword,
  error,
  loading,
  onClearError,
}: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === 'reset') {
      const success = await onResetPassword(email);
      if (success) setResetSent(true);
    } else if (mode === 'login') {
      await onSignIn(email, password);
    } else {
      await onSignUp(email, password, username);
    }
  };

  const switchMode = (newMode: 'login' | 'register' | 'reset') => {
    setMode(newMode);
    setResetSent(false);
    onClearError();
  };

  return (
    <div className="login-container">
      <Card padding="lg">
        <h1 className="login-title">Scrabblish</h1>
        <p className="login-subtitle">Multi-language word games</p>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <Input
              type="text"
              placeholder="Username (unique, no spaces)"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          {mode !== 'reset' && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          )}

          {error && <p className="login-error">{error}</p>}
          {resetSent && <p className="login-success">Check your email for a reset link.</p>}

          <Button type="submit" disabled={loading} className="login-submit">
            {loading ? <Spinner size="sm" /> : mode === 'reset' ? 'Send Reset Link' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {mode === 'login' && (
          <button onClick={() => switchMode('reset')} className="login-toggle login-forgot">
            Forgot password?
          </button>
        )}
        <button onClick={() => switchMode(mode === 'register' ? 'login' : mode === 'reset' ? 'login' : 'register')} className="login-toggle">
          {mode === 'register'
            ? 'Already have an account? Sign in'
            : mode === 'reset'
            ? 'Back to sign in'
            : "Don't have an account? Sign up"}
        </button>
      </Card>
    </div>
  );
}
