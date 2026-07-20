import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  Platform,
  Alert 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../styles/theme';
import { ShieldAlert, User, LogIn, Mail, Lock } from 'lucide-react-native';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, loginWithEmail, registerWithEmail, loginWithGoogle, loginAnonymously, role, language } = useAuth() as any;
  const { colors, Theme } = useTheme();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.secondaryText, marginTop: 12 }]}>
          {language === 'mr' ? 'प्रमाणित करत आहे...' : 'Verifying Session...'}
        </Text>
      </View>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const handleAuthAction = async () => {
    if (!email || !password) {
      setAuthError(language === 'mr' ? 'कृपया ईमेल आणि पासवर्ड प्रविष्ट करा.' : 'Please enter email and password.');
      return;
    }
    setAuthError('');
    setActionLoading(true);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (e: any) {
      setAuthError(e.message || 'Authentication failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setActionLoading(true);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      setAuthError(e.message || 'Google sign in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setAuthError('');
    setActionLoading(true);
    try {
      await loginAnonymously();
    } catch (e: any) {
      setAuthError(e.message || 'Anonymous sign in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.primaryText }]}>
          {isRegistering 
            ? (language === 'mr' ? 'नवीन खाते तयार करा' : 'Create Account')
            : (language === 'mr' ? 'लॉगीट एआय लॉगिन' : 'Logit AI Login')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          {language === 'mr' ? 'आपला व्यवसाय सुरक्षितपणे ट्रॅक करा' : 'Securely track your business ledger'}
        </Text>

        {authError ? (
          <View style={[styles.errorContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Mail size={18} color={colors.secondaryText} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.primaryText }]}
              placeholder={language === 'mr' ? 'ईमेल' : 'Email Address'}
              placeholderTextColor={colors.secondaryText}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!actionLoading}
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Lock size={18} color={colors.secondaryText} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.primaryText }]}
              placeholder={language === 'mr' ? 'पासवर्ड' : 'Password'}
              placeholderTextColor={colors.secondaryText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!actionLoading}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: colors.accent }]} 
          onPress={handleAuthAction}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>
              {isRegistering 
                ? (language === 'mr' ? 'खाते तयार करा' : 'Sign Up')
                : (language === 'mr' ? 'साइन इन करा' : 'Sign In')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Google Sign In */}
        <TouchableOpacity 
          style={[styles.googleBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} 
          onPress={handleGoogleSignIn}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          <Text style={[styles.googleBtnText, { color: colors.primaryText }]}>
            {language === 'mr' ? 'गूगल सह सुरू करा' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.secondaryText }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity 
          style={[styles.secondaryBtn, { borderColor: colors.border }]} 
          onPress={handleAnonymousSignIn}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.secondaryText }]}>
            {language === 'mr' ? 'साइन इन न करता वापरा' : 'Try Anonymously'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toggleAuthMode}
          onPress={() => setIsRegistering(!isRegistering)}
          disabled={actionLoading}
        >
          <Text style={[styles.toggleAuthModeText, { color: colors.accent }]}>
            {isRegistering 
              ? (language === 'mr' ? 'आधीच खाते आहे? लॉगिन करा' : 'Already have an account? Sign In')
              : (language === 'mr' ? 'नवीन खाते? नोंदणी करा' : 'Create an Account')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.2)' },
      default: {
        shadowColor: '#000000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      }
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  googleBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleAuthMode: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleAuthModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
