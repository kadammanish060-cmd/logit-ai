import { Platform } from 'react-native';

export const Theme = {
  colors: {
    background: '#000000',
    surface: '#1F1F1F',
    surfaceElevated: '#2A2A2A',
    border: 'rgba(255,255,255,0.05)',
    primaryText: '#FFFFFF',
    secondaryText: '#A1A1AA',
    mutedText: '#71717A',
    accent: '#3B82F6',
  },
  typography: {
    displayLg: {
      fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
      fontSize: 48,
      fontWeight: '600' as const,
      lineHeight: 56,
      letterSpacing: -0.96, // 48 * -0.02
    },
    headlineLg: {
      fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
      fontSize: 32,
      fontWeight: '600' as const,
      lineHeight: 40,
      letterSpacing: -0.32, // 32 * -0.01
    },
    headlineLgMobile: {
      fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
      fontSize: 28,
      fontWeight: '600' as const,
      lineHeight: 34,
    },
    bodyLg: {
      fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 28,
    },
    bodyMd: {
      fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    labelSm: {
      fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.6, // 12 * 0.05
    },
  },
  radius: {
    button: 999, // full/pill
    card: 24,
    panel: 28,
  },
  spacing: {
    base: 8,
    xs: 4,
    sm: 12,
    md: 24,
    lg: 40,
    xl: 64,
    gutter: 16,
    marginMobile: 20,
    marginDesktop: 120,
  }
};
