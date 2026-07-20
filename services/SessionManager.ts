import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export class SessionManager {
  private static ROLE_KEY = 'logit_role';
  private static LANG_KEY = 'logit_lang';
  private static ONBOARDED_KEY = 'logit_onboarded';

  /**
   * Save session state in local storage/AsyncStorage
   */
  static async saveSession(onboarded: boolean, role: 'admin' | 'normal', language: 'en' | 'mr'): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.ONBOARDED_KEY, String(onboarded));
        window.localStorage.setItem(this.ROLE_KEY, role);
        window.localStorage.setItem(this.LANG_KEY, language);
      } else {
        await AsyncStorage.setItem(this.ONBOARDED_KEY, String(onboarded));
        await AsyncStorage.setItem(this.ROLE_KEY, role);
        await AsyncStorage.setItem(this.LANG_KEY, language);
      }
    } catch (error) {
      console.error("SessionManager: saveSession failed", error);
    }
  }

  /**
   * Load session state
   */
  static async loadSession(): Promise<{ onboarded: boolean; role: 'admin' | 'normal'; language: 'en' | 'mr' }> {
    try {
      let onboardedStr: string | null = null;
      let roleStr: string | null = null;
      let langStr: string | null = null;

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        onboardedStr = window.localStorage.getItem(this.ONBOARDED_KEY);
        roleStr = window.localStorage.getItem(this.ROLE_KEY);
        langStr = window.localStorage.getItem(this.LANG_KEY);
      } else {
        onboardedStr = await AsyncStorage.getItem(this.ONBOARDED_KEY);
        roleStr = await AsyncStorage.getItem(this.ROLE_KEY);
        langStr = await AsyncStorage.getItem(this.LANG_KEY);
      }

      return {
        onboarded: onboardedStr === 'true',
        role: (roleStr === 'admin' || roleStr === 'normal') ? roleStr : 'admin',
        language: (langStr === 'en' || langStr === 'mr') ? langStr : 'en'
      };
    } catch (error) {
      console.error("SessionManager: loadSession failed", error);
      return { onboarded: false, role: 'admin', language: 'en' };
    }
  }

  /**
   * Clean up session details on logout
   */
  static async clearSession(): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.ROLE_KEY);
        window.localStorage.removeItem(this.LANG_KEY);
        window.localStorage.removeItem(this.ONBOARDED_KEY);
      } else {
        await AsyncStorage.removeItem(this.ROLE_KEY);
        await AsyncStorage.removeItem(this.LANG_KEY);
        await AsyncStorage.removeItem(this.ONBOARDED_KEY);
      }
    } catch (error) {
      console.error("SessionManager: clearSession failed", error);
    }
  }
}
