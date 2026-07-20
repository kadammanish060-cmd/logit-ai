import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'admin' | 'normal';
  language: 'en' | 'mr';
  updatedAt: string;
}

export class AuthService {
  /**
   * Log in using Email & Password
   */
  static async loginWithEmail(email: string, password: string): Promise<User> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return credential.user;
    } catch (error) {
      console.error("AuthService: loginWithEmail failed", error);
      throw error;
    }
  }

  /**
   * Register a new user with Email & Password
   */
  static async registerWithEmail(
    email: string, 
    password: string, 
    role: 'admin' | 'normal' = 'admin', 
    language: 'en' | 'mr' = 'en'
  ): Promise<User> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // Save user profile document in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        role,
        language,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", user.uid), userProfile);
      return user;
    } catch (error) {
      console.error("AuthService: registerWithEmail failed", error);
      throw error;
    }
  }

  /**
   * Sign in using Google Auth Provider
   */
  static async loginWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const user = credential.user;

      // Check if user profile already exists, if not create default
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          role: 'admin',
          language: 'en',
          updatedAt: new Date().toISOString()
        };
        await setDoc(userDocRef, userProfile);
      }

      return user;
    } catch (error) {
      console.error("AuthService: loginWithGoogle failed", error);
      throw error;
    }
  }

  /**
   * Log out current user
   */
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("AuthService: logout failed", error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("AuthService: sendPasswordReset failed", error);
      throw error;
    }
  }

  /**
   * Fetch current user profile from Firestore
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDocRef = doc(db, "users", uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("AuthService: getUserProfile failed", error);
      return null;
    }
  }

  /**
   * Return current Auth user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }
}
