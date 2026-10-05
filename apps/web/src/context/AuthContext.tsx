"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@yatrasarthi/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  checkSession: () => Promise<User | null>;
  logout: () => Promise<void>;
  showAuthFlow: boolean;
  authStep: 'splash' | 'onboarding' | 'signin' | 'permissions' | null;
  startAuthFlow: (step?: 'onboarding' | 'signin' | 'permissions') => void;
  closeAuthFlow: () => void;
  setAuthStep: (step: 'splash' | 'onboarding' | 'signin' | 'permissions' | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  checkSession: async () => null,
  logout: async () => {},
  showAuthFlow: false,
  authStep: null,
  startAuthFlow: () => {},
  closeAuthFlow: () => {},
  setAuthStep: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [authStep, setAuthStep] = useState<'splash' | 'onboarding' | 'signin' | 'permissions' | null>('splash');

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.data?.user) {
        setUser(data.data.user);
        return data.data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Enforce a minimum 2.5s delay so the beautiful splash animation is actually visible
    const minSplashDelay = new Promise(resolve => setTimeout(resolve, 2500));
    const sessionPromise = checkSession();

    Promise.all([minSplashDelay, sessionPromise]).then(([_, currentUser]) => {
      // If no session found on initial app open, prompt onboarding/login
      if (!currentUser) {
        // Check if user has seen onboarding before
        const seenOnboarding = typeof window !== 'undefined' ? localStorage.getItem('yatrasarthi_seen_onboarding') : null;
        if (!seenOnboarding) {
          setAuthStep('onboarding');
          setShowAuthFlow(true);
        } else {
          setAuthStep(null);
          setShowAuthFlow(false);
        }
      } else {
        setAuthStep(null);
        setShowAuthFlow(false);
      }
    });
  }, [checkSession]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
      setShowAuthFlow(false);
      setAuthStep(null);
    }
  }, []);

  const startAuthFlow = useCallback((step: 'onboarding' | 'signin' | 'permissions' = 'signin') => {
    setAuthStep(step);
    setShowAuthFlow(true);
  }, []);

  const closeAuthFlow = useCallback(() => {
    setShowAuthFlow(false);
    setAuthStep(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        checkSession,
        logout,
        showAuthFlow,
        authStep,
        startAuthFlow,
        closeAuthFlow,
        setAuthStep,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
