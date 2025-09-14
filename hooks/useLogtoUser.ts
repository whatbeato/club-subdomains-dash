'use client';

import { useState, useEffect } from 'react';

interface UserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface UseLogtoUser {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  isLoading: boolean;
  error: Error | null;
  signIn: (redirectUri?: string) => void;
  signOut: (redirectUri?: string) => void;
}

export const useLogtoUser = (): UseLogtoUser => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch('/api/user-info');
        const data = await res.json();

        if (res.ok && data.isAuthenticated) {
          setIsAuthenticated(true);
          setUserInfo(data.userInfo);
        } else {
          setIsAuthenticated(false);
          setUserInfo(null);
        }
      } catch (err: any) {
        setError(err);
        setIsAuthenticated(false);
        setUserInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const signIn = (redirectUri: string = 'http://localhost:3000') => {
    console.log('signIn called', redirectUri);
    window.location.href = `/api/logto/sign-in?redirectUri=${encodeURIComponent(redirectUri)}`;
  };

  const signOut = (redirectUri: string = 'http://localhost:3000') => {
    window.location.href = `/api/logto/sign-out?redirectUri=${encodeURIComponent(redirectUri)}`;
  };

  return {
    isAuthenticated,
    userInfo,
    isLoading,
    error,
    signIn,
    signOut,
  };
};
