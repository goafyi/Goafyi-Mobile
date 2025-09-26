import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: 'viewer' | 'vendor' | 'admin'
  created_at: string
  updated_at: string
}

interface SupabaseContextType {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, role?: 'viewer' | 'vendor') => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

export const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

interface SupabaseProviderProps {
  children: React.ReactNode
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const getCachedAvatarUrl = async (userId: string): Promise<string | undefined> => {
    try {
      const cached = await AsyncStorage.getItem(`avatar_url_${userId}`)
      if (!cached) return undefined
      const parsed = JSON.parse(cached)
      const ttlMs = 7 * 24 * 60 * 60 * 1000
      if (!parsed || Date.now() - (parsed.ts || 0) > ttlMs) return undefined
      return parsed.url as string | undefined
    } catch { return undefined }
  }

  const setCachedAvatarUrl = async (userId: string, url?: string) => {
    try { 
      if (url) {
        await AsyncStorage.setItem(`avatar_url_${userId}`, JSON.stringify({ ts: Date.now(), url }))
      }
    } catch {}
  }

  useEffect(() => {
    let isMounted = true
    
    // Get initial session
    const getInitialSession = async () => {
      if (!isMounted) return
      
      console.log("🚀 SupabaseContext: Getting initial session...")
      try {
        // Check if Supabase is properly configured
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        
        if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
          console.log("⚠️ Supabase not configured, skipping auth check")
          setLoading(false)
          return
        }
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        console.log("🚀 SupabaseContext: Initial session result:", session?.user?.id ? `User: ${session.user.id}` : "No session")
        
        if (session?.user) {
          console.log("🚀 SupabaseContext: Initial session found, fetching fresh user data for:", session.user.id);
          const userProfile = await getCurrentUser()
          if (userProfile && isMounted) {
            console.log("🚀 SupabaseContext: Setting initial user:", userProfile.id, userProfile.role);
            setUser(userProfile)
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('❌ SupabaseContext: Error getting initial session:', error)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          console.log("🚀 SupabaseContext: Initial session loading completed")
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      console.log("🔄 SupabaseContext onAuthStateChange:", event, session?.user?.id, "Current user:", user?.id);
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log("🔄 SupabaseContext: SIGNED_IN event, fetching fresh user data for:", session.user.id);
          const userProfile = await getCurrentUser()
          if (userProfile && isMounted) {
            console.log("🔄 SupabaseContext: Setting user from SIGNED_IN event:", userProfile.id, userProfile.role);
            setUser(userProfile)
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            console.log("🔄 SupabaseContext: SIGNED_OUT event, clearing user");
            setUser(null)
          }
        } else if (session?.user) {
          console.log("🔄 SupabaseContext: Session exists, fetching fresh user data for:", session.user.id);
          const userProfile = await getCurrentUser()
          if (userProfile && isMounted) {
            console.log("🔄 SupabaseContext: Setting user from session:", userProfile.id, userProfile.role);
            setUser(userProfile)
          }
        } else {
          if (isMounted) {
            console.log("🔄 SupabaseContext: No session, clearing user");
            setUser(null)
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('❌ SupabaseContext: Error handling auth state change:', error)
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const getCurrentUser = async (): Promise<AuthUser | null> => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return null

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error || !userData) return null

      return userData as AuthUser
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: 'viewer' | 'vendor' = 'viewer') => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (error) throw error

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
            role: role
          })

        if (profileError) throw profileError
      }

      return data
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔐 SupabaseContext.signIn: Starting sign in process for:', email)
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      console.log('🔐 SupabaseContext.signIn: AuthService result:', data?.user?.id)
      
      if (data?.user) {
        console.log('🔐 SupabaseContext.signIn: Setting user in context:', data.user.id)
        const userProfile = await getCurrentUser()
        if (userProfile) {
          setUser(userProfile)
        }
      }
      
      console.log('✅ SupabaseContext.signIn: Sign in process completed')
      return data
    } catch (error) {
      console.error('❌ SupabaseContext.signIn: Error during sign in:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('🚪 SupabaseContext.signOut: Starting complete sign out process...')
    setLoading(true)
    
    try {
      await supabase.auth.signOut()
      setUser(null)
      
      console.log('✅ SupabaseContext.signOut: Complete sign out successful')
    } catch (error) {
      console.error('❌ SupabaseContext.signOut: Error during sign out:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<AuthUser>) => {
    try {
      if (!user) throw new Error('No user logged in')

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error

      // Refresh user data from database to get the latest information
      const freshUserData = await getCurrentUser()
      if (freshUserData) {
        setUser(freshUserData)
        if (updates.avatar_url) await setCachedAvatarUrl(freshUserData.id, updates.avatar_url)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    } catch (error) {
      console.error('Error updating password:', error)
      throw error
    }
  }

  const value: SupabaseContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}
