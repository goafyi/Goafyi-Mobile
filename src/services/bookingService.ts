import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Booking = Database['public']['Tables']['bookings']['Row']
type BookingInsert = Database['public']['Tables']['bookings']['Insert']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export interface BookingWithDetails extends Booking {
  vendor: {
    business_name: string
    category: string
    location: string
    user: {
      full_name: string | null
      phone: string | null
    }
  }
  user: {
    full_name: string | null
    email: string
    phone: string | null
  }
}

export class BookingService {
  // Create a new booking
  static async createBooking(bookingData: BookingInsert): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get bookings for a user
  static async getUserBookings(userId: string): Promise<BookingWithDetails[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        vendor:vendors!bookings_vendor_id_fkey(
          business_name,
          category,
          location,
          user:users!vendors_user_id_fkey(full_name, phone)
        ),
        user:users!bookings_user_id_fkey(full_name, email, phone)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as BookingWithDetails[]
  }

  // Get bookings for a vendor
  static async getVendorBookings(vendorId: string): Promise<BookingWithDetails[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        vendor:vendors!bookings_vendor_id_fkey(
          business_name,
          category,
          location,
          user:users!vendors_user_id_fkey(full_name, phone)
        ),
        user:users!bookings_user_id_fkey(full_name, email, phone)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as BookingWithDetails[]
  }

  // Get booking by ID
  static async getBookingById(id: string): Promise<BookingWithDetails | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        vendor:vendors!bookings_vendor_id_fkey(
          business_name,
          category,
          location,
          user:users!vendors_user_id_fkey(full_name, phone)
        ),
        user:users!bookings_user_id_fkey(full_name, email, phone)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as BookingWithDetails
  }

  // Update booking status
  static async updateBookingStatus(id: string, status: Booking['status']): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update booking details
  static async updateBooking(id: string, updates: BookingUpdate): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Cancel booking
  static async cancelBooking(id: string): Promise<Booking> {
    return this.updateBookingStatus(id, 'cancelled')
  }

  // Confirm booking
  static async confirmBooking(id: string): Promise<Booking> {
    return this.updateBookingStatus(id, 'confirmed')
  }

  // Complete booking
  static async completeBooking(id: string): Promise<Booking> {
    return this.updateBookingStatus(id, 'completed')
  }

  // Get booking statistics for a vendor
  static async getVendorBookingStats(vendorId: string): Promise<{
    total: number
    pending: number
    confirmed: number
    completed: number
    cancelled: number
  }> {
    const { data, error } = await supabase
      .from('bookings')
      .select('status')
      .eq('vendor_id', vendorId)

    if (error) throw error

    const stats = {
      total: data.length,
      pending: data.filter(b => b.status === 'pending').length,
      confirmed: data.filter(b => b.status === 'confirmed').length,
      completed: data.filter(b => b.status === 'completed').length,
      cancelled: data.filter(b => b.status === 'cancelled').length
    }

    return stats
  }

  // Get upcoming bookings for a vendor
  static async getUpcomingVendorBookings(vendorId: string, limit: number = 5): Promise<BookingWithDetails[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        vendor:vendors!bookings_vendor_id_fkey(
          business_name,
          category,
          location,
          user:users!vendors_user_id_fkey(full_name, phone)
        ),
        user:users!bookings_user_id_fkey(full_name, email, phone)
      `)
      .eq('vendor_id', vendorId)
      .in('status', ['pending', 'confirmed'])
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data as BookingWithDetails[]
  }

  // Check if vendor is available on a specific date
  static async checkVendorAvailability(vendorId: string, date: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('event_date', date)
      .in('status', ['pending', 'confirmed'])

    if (error) throw error

    // If there are any bookings on this date, vendor is not available
    return data.length === 0
  }
}
