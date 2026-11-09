import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme/colors';

export function Badge({ label, variant = 'default', size = 'sm' }) {
  let bg = colors.bgSurface;
  let text = colors.textSecondary;
  let border = colors.borderLight;

  switch (variant) {
    case 'success':
    case 'published':
    case 'completed':
    case 'active':
    case 'passed':
      bg = 'rgba(16, 185, 129, 0.15)';
      text = colors.accentEmerald;
      border = 'rgba(16, 185, 129, 0.3)';
      break;
    case 'warning':
    case 'draft':
    case 'pending':
    case 'in_progress':
      bg = 'rgba(245, 158, 11, 0.15)';
      text = colors.accentAmber;
      border = 'rgba(245, 158, 11, 0.3)';
      break;
    case 'danger':
    case 'archived':
    case 'failed':
    case 'revoked':
    case 'overdue':
      bg = 'rgba(239, 68, 68, 0.15)';
      text = colors.accentRose;
      border = 'rgba(239, 68, 68, 0.3)';
      break;
    case 'primary':
    case 'certificate':
    case 'super_admin':
      bg = 'rgba(99, 102, 241, 0.15)';
      text = colors.primaryLight;
      border = 'rgba(99, 102, 241, 0.3)';
      break;
    case 'cyan':
    case 'instructor':
      bg = 'rgba(6, 182, 212, 0.15)';
      text = colors.accentCyan;
      border = 'rgba(6, 182, 212, 0.3)';
      break;
    case 'violet':
    case 'institution_admin':
      bg = 'rgba(139, 92, 246, 0.15)';
      text = colors.accentViolet;
      border = 'rgba(139, 92, 246, 0.3)';
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  text: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  }
});
