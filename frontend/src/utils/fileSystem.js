/**
 * ZENORA LMS - 4-TIER UNIVERSAL FILE SYSTEM & DOCUMENT VIEWER ADAPTER
 * Seamless document viewing, downloading, and sharing across iOS, Android, Web, and Windows.
 */

import { Platform, Linking } from 'react-native';
import { resolveFileUrl } from '../api/client';

// Safely probe for native Expo file modules
let FileSystem = null;
let Sharing = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    FileSystem = require('expo-file-system');
    Sharing = require('expo-sharing');
  } catch (e) {
    console.warn('[FileSystem] Native file-system / sharing modules loading in fallback mode.');
  }
}

/**
 * Universal File Download & Save
 * - Web: Fetches Blob, creates object URL, triggers download anchor
 * - Mobile (iOS & Android): Downloads to documentDirectory and invokes native Sharing sheet
 * - Windows Desktop: Invokes default browser or system download handler
 */
export async function downloadFile(url, filename = 'document.pdf') {
  if (!url) return false;
  const resolvedUrl = resolveFileUrl(url);
  const targetName = filename || (url.split('/').pop().split('\\').pop()) || 'zenora_document.pdf';

  // ==========================================
  // TIER 1: MODERN WEB / DESKTOP WEB
  // ==========================================
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error('File not found on server');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = targetName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      return true;
    } catch (webErr) {
      console.warn('[downloadFile Web Blob failed, falling back to window.open]:', webErr);
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
  }

  // ==========================================
  // TIER 2 & 3: iOS & ANDROID NATIVE
  // ==========================================
  if ((Platform.OS === 'ios' || Platform.OS === 'android') && FileSystem) {
    try {
      const sanitizedName = targetName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localUri = `${FileSystem.documentDirectory}${sanitizedName}`;

      console.log(`[FileSystem] Downloading ${resolvedUrl} to ${localUri}...`);
      const downloadResult = await FileSystem.downloadAsync(resolvedUrl, localUri);

      if (downloadResult.status === 200 && Sharing) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Save or Open ${targetName}`,
            UTI: 'com.adobe.pdf'
          });
          return true;
        }
      }
      return true;
    } catch (mobileErr) {
      console.warn('[downloadFile Mobile Native error, falling back to Linking]:', mobileErr.message);
    }
  }

  // ==========================================
  // TIER 4: WINDOWS DESKTOP & UNIVERSAL FALLBACK
  // ==========================================
  try {
    const supported = await Linking.canOpenURL(resolvedUrl);
    if (supported) {
      await Linking.openURL(resolvedUrl);
      return true;
    }
  } catch (err) {
    console.error('[downloadFile Fallback Linking Error]:', err);
  }

  return false;
}

/**
 * Universal File Viewer Launcher
 */
export async function viewFile(url, title = 'Document Preview') {
  if (!url) return;
  const resolvedUrl = resolveFileUrl(url);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    await Linking.openURL(resolvedUrl);
  } catch (err) {
    console.error('[viewFile error]:', err);
  }
}

export default {
  downloadFile,
  viewFile
};

