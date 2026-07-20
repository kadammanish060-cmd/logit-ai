import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { AuthService, UserProfile } from '../services/AuthService';
import { SessionManager } from '../services/SessionManager';
import * as firebaseService from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  role: 'admin' | 'normal';
  language: 'en' | 'mr';
  setRole: (role: 'admin' | 'normal') => void;
  setLanguage: (lang: 'en' | 'mr') => void;
  loginWithEmail: (e: string, p: string) => Promise<User>;
  registerWithEmail: (e: string, p: string, r?: 'admin' | 'normal', l?: 'en' | 'mr') => Promise<User>;
  loginWithGoogle: (idToken?: string, accessToken?: string) => Promise<User>;
  loginAnonymously: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<'admin' | 'normal'>('admin');
  const [language, setLanguageState] = useState<'en' | 'mr'>('en');

  // Sync state changes with SessionManager
  const setRole = (newRole: 'admin' | 'normal') => {
    setRoleState(newRole);
    SessionManager.saveSession(true, newRole, language);
  };

  const setLanguage = (newLang: 'en' | 'mr') => {
    setLanguageState(newLang);
    SessionManager.saveSession(true, role, newLang);
  };

  useEffect(() => {
    // Load initial cached session
    SessionManager.loadSession().then((session) => {
      setRoleState(session.role);
      setLanguageState(session.language);
    });

    let unsubscribeSync: (() => void) | null = null;

    // Listen to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile
        let profile = await AuthService.getUserProfile(currentUser.uid);
        if (profile) {
          setUserProfile(profile);
          if (profile.role) setRoleState(profile.role);
          if (profile.language) setLanguageState(profile.language);
        } else {
          // Default profile
          profile = {
            uid: currentUser.uid,
            email: currentUser.email,
            role: 'admin',
            language: 'en',
            updatedAt: new Date().toISOString()
          };
          setUserProfile(profile);
          try {
            const { doc, setDoc } = require('firebase/firestore');
            await setDoc(doc(db, "users", currentUser.uid), profile);
          } catch (e) {
            console.warn("Failed to write default user profile to Firestore", e);
          }
        }

        // Start listening to Firestore remote changes for this user
        unsubscribeSync = firebaseService.setupFirestoreListeners(currentUser.uid);
        // Push local changes if any
        firebaseService.pushLocalStateToFirestore();
      } else {
        setUserProfile(null);
        if (unsubscribeSync) {
          unsubscribeSync();
          unsubscribeSync = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSync) unsubscribeSync();
    };
  }, []);

  const loginWithEmail = async (e: string, p: string) => {
    setLoading(true);
    try {
      const u = await AuthService.loginWithEmail(e, p);
      await SessionManager.saveSession(true, role, language);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (e: string, p: string, r = role, l = language) => {
    setLoading(true);
    try {
      const u = await AuthService.registerWithEmail(e, p, r, l);
      await SessionManager.saveSession(true, r, l);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (idToken?: string, accessToken?: string) => {
    setLoading(true);
    try {
      const u = await AuthService.loginWithGoogle(idToken, accessToken);
      await SessionManager.saveSession(true, role, language);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const loginAnonymously = async () => {
    setLoading(true);
    try {
      const u = await firebaseService.loginAnonymously();
      await SessionManager.saveSession(true, role, language);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthService.logout();
      await SessionManager.clearSession();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        role,
        language,
        setRole,
        setLanguage,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAnonymously,
        logout,
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
