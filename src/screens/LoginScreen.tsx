import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';

export default function LoginScreen({ navigation }: { navigation?: any }) {
  const { signIn, signUp } = useSupabase();
  const insets = useSafeAreaInsets();
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    if (isSignUp && !form.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (!form.password.trim()) {
      setError('Password is required');
      return false;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (isSignUp && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        console.log('🟢 LoginScreen: starting sign-up', { email: form.email });
        await signUp(form.email, form.password, form.fullName, 'viewer');
        // Navigate back to home after successful signup
        if (navigation) {
          navigation.navigate('home');
        }
      } else {
        await signIn(form.email, form.password);
        // Navigate back to home after successful login
        if (navigation) {
          navigation.navigate('home');
        }
      }
    } catch (err: any) {
      console.error('💥 LoginScreen: exception', err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Subtle Background Pattern */}
      <View style={styles.backgroundPattern}>
        <View style={styles.patternCircle1} />
        <View style={styles.patternCircle2} />
        <View style={styles.patternCircle3} />
      </View>

      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} />
            </View>
          </View>
          <Text style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Join Goafyi and discover amazing vendors' : 'Sign in to your account'}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <User size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChangeText={(text) => setForm(prev => ({ ...prev, fullName: text }))}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={form.email}
                  onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  value={form.password}
                  onChangeText={(text) => setForm(prev => ({ ...prev, password: text }))}
                  secureTextEntry
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </View>
            </View>

            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    value={form.confirmPassword}
                    onChangeText={(text) => setForm(prev => ({ ...prev, confirmPassword: text }))}
                    secureTextEntry
                    autoComplete="new-password"
                  />
                </View>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading 
                  ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setIsSignUp(!isSignUp);
                setForm({ fullName: '', email: '', password: '', confirmPassword: '' });
                setError(null);
              }}
            >
              <Text style={styles.toggleLink}>
                {isSignUp ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // bg-gradient-to-br from-slate-50 via-white to-rose-50
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
  },
  patternCircle1: {
    position: 'absolute',
    top: 80,
    left: 80,
    width: 128,
    height: 128,
    backgroundColor: '#fecaca', // bg-rose-200
    borderRadius: 64,
    // blur-3xl effect simulated with opacity
  },
  patternCircle2: {
    position: 'absolute',
    bottom: 80,
    right: 80,
    width: 160,
    height: 160,
    backgroundColor: '#e9d5ff', // bg-purple-200
    borderRadius: 80,
  },
  patternCircle3: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 240,
    height: 240,
    backgroundColor: '#fce7f3', // bg-pink-200
    borderRadius: 120,
    transform: [{ translateX: -120 }, { translateY: -120 }],
  },
  content: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    zIndex: 10,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  logoContainer: {
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoWrapper: {
    width: 200,
    height: 200,
    backgroundColor: 'white',
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#fce7f3', // border-rose-100
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 190,
    height: 190,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827', // text-gray-900
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#6b7280', // text-gray-600
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151', // text-gray-700
    marginBottom: 2,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    width: '100%',
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#be185d',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  toggleContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    color: '#6b7280',
    fontSize: 14,
  },
  toggleLink: {
    color: '#be185d',
    fontWeight: '600',
    marginTop: 4,
    fontSize: 14,
  },
});