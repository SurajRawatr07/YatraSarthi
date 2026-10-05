"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from './SplashScreen';
import { OnboardingScreen } from './OnboardingScreen';
import { PhoneSignIn } from './PhoneSignIn';
import { PermissionsScreen } from './PermissionsScreen';
import { User } from '@yatrasarthi/types';

export function AuthFlowModal() {
  const { authStep, setAuthStep, closeAuthFlow, setUser } = useAuth();

  if (!authStep) return null;

  const handleOnboardingComplete = () => {
    setAuthStep('signin');
  };

  const handleSignInSuccess = (user: User, isNewUser: boolean) => {
    setUser(user);
    if (isNewUser) {
      setAuthStep('permissions');
    } else {
      closeAuthFlow();
    }
  };

  const handlePermissionsComplete = () => {
    closeAuthFlow();
  };

  switch (authStep) {
    case 'splash':
      return <SplashScreen />;
    case 'onboarding':
      return (
        <OnboardingScreen
          onComplete={handleOnboardingComplete}
          onSkip={closeAuthFlow}
        />
      );
    case 'signin':
      return (
        <PhoneSignIn
          onSuccess={handleSignInSuccess}
          onBack={() => setAuthStep('onboarding')}
          onClose={closeAuthFlow}
        />
      );
    case 'permissions':
      return <PermissionsScreen onComplete={handlePermissionsComplete} />;
    default:
      return null;
  }
}
