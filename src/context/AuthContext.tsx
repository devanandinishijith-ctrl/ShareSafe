import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile } from '../types';
import { apiAuth } from '../lib/api';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initSession = async () => {
    try {
      setLoading(true);
      const { user: currentUser } = await apiAuth.getSession();
      setUser(currentUser);
    } catch (err) {
      console.error('Failed to restore auth session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await apiAuth.signIn(email, password);
    if (result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error || 'Failed to sign in' };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const result = await apiAuth.signUp(email, password, name);
    if (result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error || 'Failed to sign up' };
  };

  const signOut = async () => {
    await apiAuth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const { user: refreshed } = await apiAuth.getSession();
    setUser(refreshed);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
