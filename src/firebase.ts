/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App with Environment Variables or Fallback to JSON Configuration file
const env = (import.meta as any).env || {};

const resolvedConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || ""
};

// Check if configuration has valid production parameters, otherwise default to offline fallback
export const isFirebaseConfigured = !!(
  resolvedConfig.apiKey &&
  resolvedConfig.apiKey !== 'your-api-key' &&
  !resolvedConfig.apiKey.includes('your-') &&
  resolvedConfig.projectId &&
  resolvedConfig.projectId !== 'your-project-id'
);

let app: any = null;
let authInstance: any = null;
let dbInstance: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(resolvedConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (err) {
    console.error("Firebase initialization failed dynamically:", err);
  }
}

// Fallbacks if not configured
export const auth = authInstance || ({
  currentUser: null,
  signOut: async () => {},
  onAuthStateChanged: () => () => {},
} as any);

export const db = dbInstance || ({} as any);

// Setup Google Auth Providers (Basic and Workspace)
export const provider = new GoogleAuthProvider();

export const workspaceProvider = new GoogleAuthProvider();
workspaceProvider.addScope('https://www.googleapis.com/auth/drive.file');
workspaceProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
workspaceProvider.addScope('https://www.googleapis.com/auth/gmail.send');
workspaceProvider.addScope('https://www.googleapis.com/auth/calendar.events');
workspaceProvider.addScope('https://www.googleapis.com/auth/contacts');

// Auth states & cache (persisted in localStorage to retain Google Workspace scopes on refresh)
let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('tcm_google_access_token');

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!isFirebaseConfigured) {
    setTimeout(() => {
      if (onAuthFailure) onAuthFailure();
    }, 50);
    return () => {};
  }

  // Check for redirect result when the app/listener initializes
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          localStorage.setItem('tcm_google_access_token', credential.accessToken);
          if (onAuthSuccess) {
            onAuthSuccess(result.user, credential.accessToken);
          }
        }
      }
    })
    .catch((err) => {
      console.error("Redirect auth resolution error:", err);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Since Firebase doesn't persist the Google Access Token on page refresh,
        // we'll require the user to click sign-in or we'll trigger token acquisition.
        // For a seamless UX, we will check if we can obtain it or let the app know auth status.
        if (onAuthSuccess) {
          onAuthSuccess(user, cachedAccessToken || "");
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('tcm_google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google sign-in flow
export const googleSignIn = async (requestWorkspace = false): Promise<{ user: User; accessToken: string } | null> => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase configuration keys are missing or invalid. Please run in Sandbox/Offline mode.');
  }

  const targetProvider = requestWorkspace ? workspaceProvider : provider;

  try {
    isSigningIn = true;
    
    // Detect mobile browser clients to prefer redirect over popup (since popups are blocked by default on mobile)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      await signInWithRedirect(auth, targetProvider);
      return null; // Will redirect the browser page
    }

    try {
      const result = await signInWithPopup(auth, targetProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Google Auth Provider');
      }

      cachedAccessToken = credential.accessToken;
      localStorage.setItem('tcm_google_access_token', credential.accessToken);
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (popupError: any) {
      // If popup blocker intervened or it failed, fallback to redirect
      console.warn("Popup blocked or failed, falling back to redirect:", popupError);
      await signInWithRedirect(auth, targetProvider);
      return null;
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout flow
export const logout = async () => {
  if (isFirebaseConfigured) {
    await auth.signOut();
  }
  cachedAccessToken = null;
  localStorage.removeItem('tcm_google_access_token');
};

// Email password sign in
export const signInWithEmail = async (email: string, pass: string): Promise<User> => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase configuration keys are missing or invalid. Please run in Sandbox/Offline mode.');
  }
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return credential.user;
};

// Email password sign up
export const signUpWithEmail = async (email: string, pass: string): Promise<User> => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase configuration keys are missing or invalid. Please run in Sandbox/Offline mode.');
  }
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  return credential.user;
};

// Get current token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Set token directly (useful if saved or updated)
export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem('tcm_google_access_token', token);
};
