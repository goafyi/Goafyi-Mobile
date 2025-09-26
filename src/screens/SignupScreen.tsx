import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';

export default function SignupScreen({ navigation }: { navigation?: any }) {
  const { signUp } = useSupabase();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!form.fullName.trim()) {
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
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      await signUp(form.email, form.password, form.fullName, 'viewer');
      Alert.alert('Success', 'Account created successfully! Please check your email to verify your account.');
      // Navigate back to home after successful signup
      if (navigation) {
        navigation.navigate('home');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Subtle Background Pattern */}
      <View style={styles.backgroundPattern}>
        <View style={styles.patternCircle1} />
        <View style={styles.patternCircle2} />
        <View style={styles.patternCircle3} />
      </View>

      <View style={styles.content}>
        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <TouchableOpacity 
            onPress={() => navigation?.goBack()} 
            style={styles.backButton}
          >
            <ArrowLeft size={16} color="#6b7280" />
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} />
            </View>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join Goafyi and discover amazing vendors
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.form}>
            {/* Full Name Input */}
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

            {/* Email Input */}
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

            {/* Password Input */}
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
                  autoComplete="new-password"
                />
              </View>
            </View>

            {/* Confirm Password Input */}
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

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Already have an account?</Text>
            <TouchableOpacity 
              onPress={() => navigation?.navigate('Login')}
            >
              <Text style={styles.toggleLink}>Sign In</Text>
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
    paddingHorizontal: 16,
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
    maxWidth: 400,
    alignSelf: 'center',
    zIndex: 10,
  },
  backButtonContainer: {
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 16,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#fce7f3', // border-rose-100
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#111827', // text-gray-900
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280', // text-gray-600
    textAlign: 'center',
    fontSize: 16,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // bg-white/80 backdrop-blur-sm
    borderRadius: 24, // rounded-3xl
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    padding: 32, // p-8
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)', // border-white/50
  },
  form: {
    gap: 24, // space-y-6
  },
  inputContainer: {
    gap: 8, // mb-2
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151', // text-gray-700
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
    paddingLeft: 40, // pl-10
    paddingRight: 16, // pr-4
    paddingVertical: 12, // py-3
    fontSize: 16, // text-base
    borderRadius: 12, // rounded-xl
    borderWidth: 1,
    borderColor: '#d1d5db', // border-gray-300
    backgroundColor: 'white',
    color: '#111827', // text-gray-900
  },
  errorContainer: {
    backgroundColor: '#fef2f2', // bg-red-50
    borderWidth: 1,
    borderColor: '#fecaca', // border-red-200
    borderRadius: 12, // rounded-xl
    padding: 12, // p-3
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626', // text-red-600
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#be185d', // bg-gradient-to-r from-rose-600 to-rose-700
    borderRadius: 12, // rounded-xl
    paddingVertical: 12, // py-3
    alignItems: 'center',
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16, // text-base
    fontWeight: '500',
  },
  toggleContainer: {
    marginTop: 24, // mt-6
    alignItems: 'center',
  },
  toggleText: {
    color: '#6b7280', // text-gray-600
    fontSize: 16,
  },
  toggleLink: {
    color: '#be185d', // text-rose-600
    fontWeight: '500',
    marginTop: 4, // mt-1
    fontSize: 16,
  },
});