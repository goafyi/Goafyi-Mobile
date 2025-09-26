import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

// For development, use placeholder values if env vars are not set
const finalSupabaseUrl = supabaseUrl || 'https://placeholder.supabase.co'
const finalSupabaseAnonKey = supabaseAnonKey || 'placeholder-key'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not set. Using placeholder values.')
  console.warn('Please create a .env file in the GoafyiMobile directory with:')
  console.warn('EXPO_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
}

export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          role: 'viewer' | 'vendor' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          role?: 'viewer' | 'vendor' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          role?: 'viewer' | 'vendor' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          user_id: string
          business_name: string
          description: string | null
          category: string
          location: string
          price_range: string | null
          rating: number | null
          review_count: number
          is_verified: boolean
          portfolio_images: string[]
          portfolio_videos: string[]
          contact_email: string | null
          contact_phone: string | null
          website: string | null
          social_media: Record<string, any> | null
          availability: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          description?: string | null
          category: string
          location: string
          price_range?: string | null
          rating?: number | null
          review_count?: number
          is_verified?: boolean
          portfolio_images?: string[]
          portfolio_videos?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          website?: string | null
          social_media?: Record<string, any> | null
          availability?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          description?: string | null
          category?: string
          location?: string
          price_range?: string | null
          rating?: number | null
          review_count?: number
          is_verified?: boolean
          portfolio_images?: string[]
          portfolio_videos?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          website?: string | null
          social_media?: Record<string, any> | null
          availability?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          vendor_id: string
          event_date: string
          event_type: string
          guest_count: number | null
          budget: number | null
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vendor_id: string
          event_date: string
          event_type: string
          guest_count?: number | null
          budget?: number | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vendor_id?: string
          event_date?: string
          event_type?: string
          guest_count?: number | null
          budget?: number | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      booking_requests: {
        Row: {
          id: string
          vendor_id: string
          user_id: string
          package_id: string | null
          notes: string | null
          requested_changes: string | null
          phone: string | null
          status: 'pending' | 'accepted' | 'declined' | 'expired' | 'countered' | 'cancelled' | 'confirmed' | 'settled_offline'
          counter_offer_details: string | null
          counter_offer_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          user_id: string
          package_id?: string | null
          notes?: string | null
          requested_changes?: string | null
          phone?: string | null
          status?: 'pending' | 'accepted' | 'declined' | 'expired' | 'countered' | 'cancelled' | 'confirmed' | 'settled_offline'
          counter_offer_details?: string | null
          counter_offer_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          user_id?: string
          package_id?: string | null
          notes?: string | null
          requested_changes?: string | null
          phone?: string | null
          status?: 'pending' | 'accepted' | 'declined' | 'expired' | 'countered' | 'cancelled' | 'confirmed' | 'settled_offline'
          counter_offer_details?: string | null
          counter_offer_price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      booking_request_dates: {
        Row: {
          id: string
          request_id: string
          event_date: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          event_date: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          event_date?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          booking_id: string | null
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          booking_id?: string | null
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          booking_id?: string | null
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
    }
  }
}
