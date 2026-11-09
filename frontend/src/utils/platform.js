/**
 * ZENORA LMS - 4-TIER UNIVERSAL PLATFORM ADAPTER
 * Abstraction bridge for iOS, Android, Modern Web, and Windows Desktop.
 */

import { Platform, Dimensions } from 'react-native';

const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';

export const isWeb = Platform.OS === 'web';
export const isWindows = Platform.OS === 'windows' || (isWeb && /windows/i.test(userAgent));
export const isIOS = Platform.OS === 'ios' || (isWeb && /iphone|ipad|ipod/i.test(userAgent));
export const isAndroid = Platform.OS === 'android' || (isWeb && /android/i.test(userAgent));
export const isMacOS = Platform.OS === 'macos' || (isWeb && /macintosh|mac os x/i.test(userAgent));

export const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';
export const isNativeDesktop = Platform.OS === 'windows' || Platform.OS === 'macos';

/**
 * Returns the canonical active target platform: 'ios' | 'android' | 'web' | 'windows'
 */
export function getPlatformType() {
  if (Platform.OS === 'windows') return 'windows';
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (isWindows && isWeb) return 'windows-web';
  return 'web';
}

/**
 * Returns human-readable platform label with badge icon
 */
export function getPlatformBadge() {
  switch (Platform.OS) {
    case 'ios':
      return { label: 'Apple iOS', icon: '🍎', tier: 'Mobile / iPad' };
    case 'android':
      return { label: 'Android', icon: '🤖', tier: 'Mobile / Tablet' };
    case 'windows':
      return { label: 'Windows Native', icon: '🪟', tier: 'Windows 10/11' };
    default:
      if (isWindows) return { label: 'Windows (Web/PWA)', icon: '🪟', tier: 'Desktop Web' };
      if (isIOS) return { label: 'Safari iOS', icon: '🍎', tier: 'Mobile Web' };
      if (isAndroid) return { label: 'Chrome Android', icon: '🤖', tier: 'Mobile Web' };
      return { label: 'Modern Web', icon: '🌐', tier: 'Desktop / Browser' };
  }
}

/**
 * Platform-conditional value selector
 * Example: selectPlatform({ web: '100%', windows: 800, default: 'auto' })
 */
export function selectPlatform(options = {}) {
  const current = Platform.OS;
  if (options[current] !== undefined) return options[current];
  if (isWindows && options.windows !== undefined) return options.windows;
  if (isWeb && options.web !== undefined) return options.web;
  if (isNativeMobile && options.mobile !== undefined) return options.mobile;
  return options.default;
}

export default {
  isWeb,
  isWindows,
  isIOS,
  isAndroid,
  isMacOS,
  isNativeMobile,
  isNativeDesktop,
  getPlatformType,
  getPlatformBadge,
  selectPlatform
};

