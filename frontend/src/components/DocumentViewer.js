import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  Image,
  ActivityIndicator
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { resolveFileUrl } from '../api/client';
import { downloadFile, viewFile } from '../utils/fileSystem';
import { isWeb, isWindows, isNativeMobile, getPlatformBadge } from '../utils/platform';

/**
 * Universal Cross-Platform Download Handler (iOS, Android, Web, Windows)
 */
export async function handleDownload(url, filename) {
  if (!url) return;
  return await downloadFile(url, filename);
}

export function DocumentViewer({
  url,
  title = 'Document Preview',
  subtitle = '',
  height = 600,
  showToolbar = true,
  onDownload
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const resolvedUrl = resolveFileUrl(url);

  if (!url) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📄</Text>
        <Text style={styles.emptyText}>No document attached.</Text>
      </View>
    );
  }

  const cleanUrl = String(url).split('?')[0].toLowerCase();
  const isPdf = cleanUrl.endsWith('.pdf') || cleanUrl.includes('/pdf') || cleanUrl.includes('/materials/') || cleanUrl.includes('/assignments/');
  const isImage = cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif');
  const fileName = url.split('/').pop().split('\\').pop() || 'document.pdf';

  const handleOpenInNewTab = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(resolvedUrl).catch(err => {
        alert('Could not open document URL: ' + err.message);
      });
    }
  };

  const handleCopyLink = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(resolvedUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const onTriggerDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    setDownloading(true);
    try {
      await handleDownload(resolvedUrl, fileName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      {showToolbar && (
        <View style={styles.toolbar}>
          <View style={styles.fileMeta}>
            <View style={[styles.badge, isPdf ? styles.pdfBadge : isImage ? styles.imgBadge : styles.docBadge]}>
              <Text style={styles.badgeText}>{isPdf ? 'PDF' : isImage ? 'IMAGE' : 'DOC'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={styles.subText}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.actionsRow}>
            {Platform.OS === 'web' ? (
              <>
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 14px',
                    backgroundColor: '#1E293B',
                    color: '#F8FAFC',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  ↗ Open in New Tab
                </a>
                <a
                  href={resolvedUrl}
                  download={fileName}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 14px',
                    backgroundColor: colors.primary || '#6366F1',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  📥 Direct Download
                </a>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={onTriggerDownload}
                  disabled={downloading}
                  activeOpacity={0.8}
                >
                  {downloading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.downloadBtnText}>📥 Direct Download</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.openBtn} onPress={handleOpenInNewTab} activeOpacity={0.8}>
                  <Text style={styles.openBtnText}>↗ Open in New Tab</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Main Document Preview Display */}
      {Platform.OS === 'web' && isPdf ? (
        <View style={styles.previewFrameWrapper}>
          <iframe
            src={resolvedUrl}
            title="Document Preview"
            style={{
              width: '100%',
              height: '80vh',
              border: 'none',
              borderRadius: '8px'
            }}
          />

          {/* Guaranteed Inline Fallback Link */}
          <View style={styles.fallbackNoticeBox}>
            <Text style={styles.fallbackNoticeText}>
              If preview doesn't load in your browser,{' '}
              <Text
                style={styles.fallbackNoticeLink}
                onPress={handleOpenInNewTab}
              >
                click here to open in new window.
              </Text>
            </Text>
          </View>
        </View>
      ) : isImage ? (
        <View style={[styles.imageContainer, { height }]}>
          <Image
            source={{ uri: resolvedUrl }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={[styles.fallbackContainer, { minHeight: 180 }]}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📁</Text>
          <Text style={styles.fallbackTitle}>{fileName}</Text>
          <Text style={styles.fallbackSub}>
            This document format is best viewed or evaluated in its native application.
          </Text>
          <TouchableOpacity style={styles.downloadBtn} onPress={onTriggerDownload} activeOpacity={0.8}>
            <Text style={styles.downloadBtnText}>📥 Download & Open File</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer Link Details */}
      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText} numberOfLines={1}>
          🔗 Document Link: <Text style={{ color: colors.primaryLight }}>{resolvedUrl}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginVertical: 8,
    width: '100%'
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: 8
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 200
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  pdfBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1
  },
  imgBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1
  },
  docBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderWidth: 1
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  titleText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.semibold
  },
  subText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  copyBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  copyBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  downloadBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  downloadBtnText: {
    color: colors.accentEmerald,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  openBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  openBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  previewFrameWrapper: {
    width: '100%',
    backgroundColor: '#0f172a',
    position: 'relative',
    padding: 6
  },
  fallbackNoticeBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fallbackNoticeText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center'
  },
  fallbackNoticeLink: {
    color: colors.primaryLight,
    textDecorationLine: 'underline',
    fontWeight: typography.weight.bold
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10
  },
  imagePreview: {
    width: '100%',
    height: '100%'
  },
  fallbackContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgDark
  },
  fallbackTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weight.bold,
    marginBottom: 4
  },
  fallbackSub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 380,
    marginBottom: 16
  },
  footerNote: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  footerNoteText: {
    color: colors.textMuted,
    fontSize: 10
  }
});
