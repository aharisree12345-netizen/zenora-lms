/**
 * ZENORA LMS - 4-TIER UNIVERSAL STORAGE ADAPTER
 * Seamless persistence across iOS, Android, Modern Web, and Windows Desktop.
 * 
 * Target Tiers:
 * - iOS / Android: Hardware-backed keychain / Keystore via expo-secure-store
 * - Modern Web: window.localStorage with sandboxed error isolation
 * - Windows Desktop: Local app data store / persistent fallback
 * - Memory Fallback: In-memory cache ensuring zero unhandled crashes
 */

import { Platform } from 'react-native';

const memoryStore = new Map();

// Safely probe for expo-secure-store on native platforms
let SecureStore = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    SecureStore = require('expo-secure-store');
  } catch (err) {
    // Dynamic fallback if running in bare/unlinked development
    console.warn('[Storage] expo-secure-store optional binding not loaded, utilizing local persistence.');
  }
}

export const storage = {
  /**
   * Universal getItem
   */
  async getItem(key) {
    if (!key) return null;

    // 1. Try Native SecureStore (iOS & Android)
    if (SecureStore && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      try {
        const value = await SecureStore.getItemAsync(key);
        if (value !== null && value !== undefined) return value;
      } catch (nativeErr) {
        // Fall through to memory or local storage
      }
    }

    // 2. Try Modern Web / Electron / Windows Web localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      } catch (webErr) {
        // Browser storage blocked or cookies disabled
      }
    }

    // 3. Fallback to in-memory map
    return memoryStore.get(key) || null;
  },

  /**
   * Universal setItem
   */
  async setItem(key, value) {
    if (!key) return;
    const strVal = String(value);

    // Save in in-memory mirror immediately
    memoryStore.set(key, strVal);

    // 1. Native SecureStore (iOS & Android)
    if (SecureStore && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      try {
        await SecureStore.setItemAsync(key, strVal);
        return;
      } catch (nativeErr) {
        console.warn(`[Storage setItem Native Warning for ${key}]:`, nativeErr.message);
      }
    }

    // 2. Modern Web / Windows
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, strVal);
        return;
      } catch (webErr) {
        console.warn(`[Storage setItem Web Warning for ${key}]:`, webErr.message);
      }
    }
  },

  /**
   * Universal removeItem
   */
  async removeItem(key) {
    if (!key) return;
    memoryStore.delete(key);

    if (SecureStore && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (nativeErr) {
        // Ignore
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (webErr) {
        // Ignore
      }
    }
  },

  /**
   * Clear all active sessions
   */
  async clear() {
    memoryStore.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.clear();
      } catch (e) {}
    }
  }
};

export default storage;
