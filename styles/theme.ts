import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';

export const DarkColors = {
  background: '#000000',
  surface: '#1F1F1F',
  surfaceElevated: '#2A2A2A',
  border: 'rgba(255,255,255,0.05)',
  primaryText: '#FFFFFF',
  secondaryText: '#A1A1AA',
  mutedText: '#71717A',
  accent: '#3B82F6',
};

export const LightColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#ECECEC',
  border: 'rgba(0,0,0,0.08)',
  primaryText: '#111111',
  secondaryText: '#666666',
  mutedText: '#8E8E93',
  accent: '#3B82F6',
};

export type ThemeType = 'system' | 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeType;
  activeTheme: 'dark' | 'light';
  colors: typeof DarkColors;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('dark'); // Default theme Dark
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark');

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem('logit_theme').then(savedTheme => {
      if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
        setThemeState(savedTheme);
      }
    });
  }, []);

  // Sync active theme configuration
  useEffect(() => {
    let resolvedTheme: 'dark' | 'light' = 'dark';
    if (theme === 'system') {
      resolvedTheme = systemColorScheme === 'light' ? 'light' : 'dark';
    } else {
      resolvedTheme = theme;
    }
    setActiveTheme(resolvedTheme);

    // Update Android navigation bar styling
    if (Platform.OS === 'android') {
      try {
        const buttonStyle = resolvedTheme === 'dark' ? 'dark' : 'light';
        NavigationBar.setStyle(buttonStyle);
      } catch (err) {
        console.warn("Failed to set Android Navigation Bar style", err);
      }
    }
  }, [theme, systemColorScheme]);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('logit_theme', newTheme);
  };

  const colors = activeTheme === 'light' ? LightColors : DarkColors;

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, activeTheme, colors, setTheme } },
    children
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const Theme = {
  colors: DarkColors, // Default export fallback
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
