import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface AuthUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  phone?: string
  role: 'viewer' | 'vendor' | 'admin'
  created_at?: string
}

export class AuthService {
  // Simple in-memory cache to prevent excessive calls
  private static userCache: { [userId: string]: { user: AuthUser; timestamp: number } } = {}
  private static vendorIdCache: { [userId: string]: { vendorId: string; timestamp: number } } = {}
  private static CACHE_DURATION = 30000 // 30 seconds
  private static VENDOR_ID_CACHE_DURATION = 300000 // 5 minutes

  // Sign up with email and password
  static async signUp(email: string, password: string, fullName: string, role: 'viewer' | 'vendor' = 'viewer') {
    console.log('🔐 AuthService.signUp called with:', { email, fullName, role });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role
        }
      }
    })

    console.log('📡 Supabase signup response:', { data, error });

    if (error) {
      console.error('❌ Supabase signup error:', error);
      throw error;
    }
    
    console.log('✅ Supabase signup successful:', data);
    return data
  }

  // Sign in with email and password
  static async signIn(email: string, password: string) {
    console.log('🔑 AuthService.signIn called with:', { email });
    const t0 = performance.now()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    const t1 = performance.now()
    console.log('📥 AuthService.signIn response:', { tookMs: Math.round(t1 - t0), data, error });
    if (error) {
      console.error('❌ AuthService.signIn error:', {
        message: (error as any)?.message,
        name: (error as any)?.name,
        status: (error as any)?.status,
        code: (error as any)?.code,
      });
      throw error
    }
    
    // Get user profile with role
    if (data.user || data.session) {
      const profile = await this.getCurrentUser()
      if (profile) {
        console.log('👤 Loaded user profile after signIn:', profile)
        return { ...data, user: profile }
      }
      return data
    }
    
    return data
  }

  static async resendConfirmation(email: string) {
    return supabase.auth.resend({ type: 'signup', email })
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear user cache on sign out
      this.clearUserCache()
    } catch (err: any) {
      // Ignore missing session errors to avoid noisy crashes
      if (err?.name === 'AuthSessionMissingError' || err?.message?.includes('Auth session missing')) {
        return
      }
      throw err
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<AuthUser | null> {
    console.log('🔍 AuthService.getCurrentUser: starting...');
    
    try {
      // First check if session exists and is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.log('🔍 AuthService.getCurrentUser: session error:', sessionError);
        return null
      }
      
      if (!session?.user) {
        console.log('🔍 AuthService.getCurrentUser: no session found');
        return null
      }
      
      // Check if session is expired
      if (session.expires_at && session.expires_at * 1000 < Date.now()) {
        console.log('🔍 AuthService.getCurrentUser: session expired, clearing...');
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.warn('⚠️ Error signing out expired session:', signOutError)
        }
        return null
      }
      
      const user = session.user
      console.log('🔍 AuthService.getCurrentUser: got valid auth user', user?.id);

      // Check cache first
      const cached = this.userCache[user.id]
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('🔍 AuthService.getCurrentUser: returning cached user data');
        return cached.user
      }

      try {
        console.log('🔍 AuthService.getCurrentUser: querying users table for id:', user.id);
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!error && profile) {
          console.log('✅ getCurrentUser: loaded from users table:', profile);
          const userData = {
            id: user.id,
            email: user.email!,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            phone: profile.phone,
            role: profile.role || (user.user_metadata as any)?.role || 'viewer',
            created_at: profile.created_at
          }
          
          // Cache the result
          this.userCache[user.id] = { user: userData, timestamp: Date.now() }
          return userData
        }

        if (error) {
          console.warn('⚠️ getCurrentUser: users table select failed, falling back to auth metadata:', error)
        }
      } catch (err) {
        console.warn('⚠️ getCurrentUser: exception during profile fetch, falling back to auth metadata:', err)
      }

      // Fallback to auth user metadata
      const meta: any = user.user_metadata || {}
      console.log('⚠️ getCurrentUser: using fallback auth metadata:', meta);
      const userData = {
        id: user.id,
        email: user.email!,
        full_name: meta.full_name,
        avatar_url: meta.avatar_url,
        phone: meta.phone,
        role: meta.role || 'viewer',
        created_at: user.created_at as any
      }
      
      // Cache the fallback result too
      this.userCache[user.id] = { user: userData, timestamp: Date.now() }
      return userData
    } catch (error) {
      console.error('❌ AuthService.getCurrentUser: unexpected error:', error)
      return null
    }
  }

  // Get vendor ID for a user (with caching)
  static async getVendorId(userId: string): Promise<string | null> {
    console.log('🔍 AuthService.getVendorId: starting for user:', userId);
    
    // Check cache first
    const cached = this.vendorIdCache[userId]
    if (cached && Date.now() - cached.timestamp < this.VENDOR_ID_CACHE_DURATION) {
      console.log('🔍 AuthService.getVendorId: returning cached vendor ID:', cached.vendorId);
      return cached.vendorId
    }

    try {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (error || !vendor) {
        console.log('🔍 AuthService.getVendorId: no vendor found for user:', userId);
        return null
      }

      // Cache the result
      this.vendorIdCache[userId] = { vendorId: vendor.id, timestamp: Date.now() }
      console.log('✅ AuthService.getVendorId: cached vendor ID:', vendor.id);
      return vendor.id
    } catch (error) {
      console.error('❌ AuthService.getVendorId: error:', error)
      return null
    }
  }

  // Clear user cache (call this on sign out)
  static clearUserCache(userId?: string) {
    if (userId) {
      // Clear memory caches
      delete this.userCache[userId]
      delete this.vendorIdCache[userId]
      console.log('🧹 AuthService: Cleared cache for user:', userId)
    } else {
      // Clear all memory caches
      this.userCache = {}
      this.vendorIdCache = {}
      console.log('🧹 AuthService: Cleared all user cache')
    }
  }

  // Update user profile
  static async updateProfile(updates: Partial<AuthUser>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No authenticated user')

    const { error } = await supabase
      .from('users')
      .update({
        full_name: updates.full_name,
        avatar_url: updates.avatar_url,
        phone: updates.phone,
        role: updates.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) throw error
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const user = await this.getCurrentUser()
          callback(user)
        } catch (error) {
          console.error('Error getting user profile:', error)
          callback(null)
        }
      } else {
        callback(null)
      }
    })
  }

  // Reset password
  static async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  // Update password
  static async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (error) throw error
  }

  // Check if email exists and get user role (with timeout to avoid hanging)
  static async checkEmailExists(email: string): Promise<{ exists: boolean; role?: string; timedOut?: boolean }> {
    console.log('🔍 Checking if email exists:', email);

    const emailCheckPromise = (async () => {
      try {
        const { data, error, status } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();

        console.log('📋 Email check query result:', { data, error, status });

        // PGRST116 (no rows) or 406 can mean no match
        if (error && (error.code === 'PGRST116' || status === 406)) {
          console.log('✅ Email does not exist, safe to proceed');
          return { exists: false } as const;
        }

        if (error) {
          console.warn('⚠️ Email check error (will not block signup):', error);
          return { exists: false } as const;
        }

        if (!data) return { exists: false } as const;
        return { exists: true, role: (data as any).role } as const;
      } catch (err) {
        console.warn('⚠️ Email check exception (will not block signup):', err);
        return { exists: false } as const;
      }
    })();

    const timeoutPromise = new Promise<{ exists: boolean; timedOut: boolean }>((resolve) => {
      const timeoutMs = 1500;
      setTimeout(() => resolve({ exists: false, timedOut: true }), timeoutMs);
    });

    const result = await Promise.race([emailCheckPromise, timeoutPromise]);
    if ((result as any).timedOut) {
      console.log('⏳ Email check timed out, proceeding with signup');
      return result as any;
    }
    return result as any;
  }
}
