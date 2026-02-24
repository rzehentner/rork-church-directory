import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, ArrowRight, Sparkles, Fingerprint } from 'lucide-react-native';
import { Image } from 'react-native';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function AuthScreen() {
  const { signIn, signUp, sendMagicLink, resetPassword, user, biometricSignIn, isBiometricAvailable, isBiometricEnabled, enableBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)/dashboard' as any);
    }
  }, [user]);

  useEffect(() => {
    const checkBiometric = async () => {
      if (isBiometricEnabled && !user) {
        handleBiometricAuth();
      }
    };
    checkBiometric();
  }, [isBiometricEnabled]);

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    const { error } = await biometricSignIn();
    if (error) {
      Alert.alert('Biometric Authentication Failed', error.message);
    }
    setIsLoading(false);
  };

  const handleAuth = async () => {
    if (!email || (!useMagicLink && !password)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      if (useMagicLink) {
        const { error } = await sendMagicLink(email);
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Success', 'Check your email for the magic link!');
          setEmail('');
        }
      } else {
        if (isSignUp && password.length < 8) {
          Alert.alert('Error', 'Password must be at least 8 characters');
          return;
        }
        const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
        if (error) {
          Alert.alert('Error', error.message);
        } else if (!isSignUp && isBiometricAvailable && !isBiometricEnabled) {
          Alert.alert(
            'Enable Biometric Login',
            'Would you like to enable biometric authentication for faster sign-in next time?',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Enable', onPress: () => enableBiometric() },
            ]
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const resetEmail = email.trim();
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Check your email for a password reset link.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.navyDark, Colors.navy]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/ebc-logo-stacked-white.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.formContainer}>
              {isBiometricEnabled && !useMagicLink && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricAuth}
                  disabled={isLoading}
                >
                  <Fingerprint size={32} color={Colors.navy} />
                  <Text style={styles.biometricText}>Sign in with Biometrics</Text>
                </TouchableOpacity>
              )}

              <View style={styles.inputContainer}>
                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="email-input"
                />
              </View>

              {!useMagicLink && (
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    testID="password-input"
                  />
                </View>
              )}

              {!useMagicLink && !isSignUp && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                  style={styles.forgotPasswordButton}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={isLoading}
                testID="auth-button"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {useMagicLink
                        ? 'Send Magic Link'
                        : isSignUp
                        ? 'Create Account'
                        : 'Sign In'}
                    </Text>
                    <ArrowRight size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={() => {
                  setUseMagicLink(!useMagicLink);
                  setPassword('');
                }}
              >
                <Sparkles size={16} color={Colors.navy} />
                <Text style={styles.magicLinkText}>
                  {useMagicLink ? 'Use password instead' : 'Use magic link'}
                </Text>
              </TouchableOpacity>

              {!useMagicLink && (
                <>
                  <View style={styles.switchContainer}>
                    <Text style={styles.switchText}>
                      {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsSignUp(!isSignUp)}
                      testID="switch-auth-mode"
                    >
                      <Text style={styles.switchLink}>
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isBiometricEnabled && (
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
    marginRight: 8,
  },
  magicLinkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  magicLinkText: {
    color: Colors.navy,
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    color: '#6B7280',
    fontSize: 14,
  },
  switchLink: {
    color: Colors.navyLight,
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  biometricButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  biometricText: {
    color: Colors.navy,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginHorizontal: 10,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: Colors.navyLight,
    fontSize: 14,
    fontWeight: '500' as const,
  },
});