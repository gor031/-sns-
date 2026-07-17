import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../../services/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  busy: boolean;
  error: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  removeAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const authErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/network-request-failed') return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
  if (code === 'auth/unauthorized-domain') return '현재 접속한 주소는 로그인 허용 도메인이 아닙니다.';
  return '로그인을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void getRedirectResult(auth).catch((redirectError) => setError(authErrorMessage(redirectError)));
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (loginError) {
      const code = typeof loginError === 'object' && loginError && 'code' in loginError
        ? String(loginError.code)
        : '';
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          setError(authErrorMessage(redirectError));
        }
        return;
      }
      setError(authErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setError('');
    try {
      await signOut(auth);
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    if (!auth.currentUser) return;
    setBusy(true);
    setError('');
    try {
      try {
        await deleteUser(auth.currentUser);
      } catch (deleteError) {
        const code = typeof deleteError === 'object' && deleteError && 'code' in deleteError
          ? String(deleteError.code)
          : '';
        if (code !== 'auth/requires-recent-login') throw deleteError;
        await reauthenticateWithPopup(auth.currentUser, googleProvider);
        await deleteUser(auth.currentUser);
      }
    } catch (deleteError) {
      setError(authErrorMessage(deleteError));
      throw deleteError;
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    busy,
    error,
    login,
    logout,
    removeAccount,
    clearError: () => setError(''),
  }), [user, loading, busy, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
