import { supabase } from '../lib/supabase'

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'countered' | 'cancelled' | 'confirmed' | 'settled_offline'

export type BookingRequestRecord = {
  id: string
  vendor_id: string
  user_id: string
  package_id: string | null
  notes?: string | null
  requested_changes?: string | null
  phone?: string | null
  status: RequestStatus
  counter_offer_details?: string | null
  counter_offer_price?: number | null
  created_at?: string
  updated_at?: string
}

export type BookingRequestDateRecord = {
  id: string
  request_id: string
  event_date: string
  created_at?: string
}

export class RequestService {
  // Create a request with multiple dates in a single transaction-like flow
  static async createRequest(payload: {
    vendor_id: string
    user_id: string
    package_id?: string | null
    dates: string[]
    notes?: string
    requested_changes?: string
    phone?: string
  }): Promise<{ request: BookingRequestRecord; dates: BookingRequestDateRecord[] }> {
    if (!payload.dates || payload.dates.length === 0) throw new Error('At least one date is required')

    const { data: req, error: reqErr } = await supabase
      .from('booking_requests')
      .insert({
        vendor_id: payload.vendor_id,
        user_id: payload.user_id,
        package_id: payload.package_id ?? null,
        notes: payload.notes ?? null,
        requested_changes: payload.requested_changes ?? null,
        phone: payload.phone ?? null,
        status: 'pending'
      })
      .select('*')
      .single()
    if (reqErr) throw reqErr

    const dateRows = payload.dates.map(d => ({ request_id: req.id, event_date: d }))
    const { data: dateData, error: dateErr } = await supabase
      .from('booking_request_dates')
      .insert(dateRows)
      .select('*')
    if (dateErr) throw dateErr

    return { request: req as BookingRequestRecord, dates: (dateData || []) as BookingRequestDateRecord[] }
  }

  static async listViewerRequests(userId: string): Promise<(BookingRequestRecord & { 
    dates: BookingRequestDateRecord[];
    vendor: { business_name: string; contact_phone: string } | null;
    package: { title: string; price: number; pricing_type: string } | null;
  })[]> {
    const { data, error } = await supabase
      .from('booking_requests')
      .select(`
        *,
        dates:booking_request_dates(*),
        vendor:vendors(business_name, contact_phone),
        package:packages(title, price, pricing_type)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as any
  }

  static async listVendorRequests(vendorId: string): Promise<(BookingRequestRecord & { 
    dates: BookingRequestDateRecord[];
    user: { full_name: string; email: string; phone: string } | null;
    package: { title: string; price: number; pricing_type: string } | null;
  })[]> {
    const { data, error } = await supabase
      .from('booking_requests')
      .select(`
        *,
        dates:booking_request_dates(*),
        user:users(full_name, email, phone),
        package:packages(title, price, pricing_type)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as any
  }

  static async updateStatus(id: string, status: RequestStatus, counterOfferDetails?: string, counterOfferPrice?: number): Promise<BookingRequestRecord> {
    const updateData: any = { status, updated_at: new Date().toISOString() }
    
    if (status === 'countered') {
      if (counterOfferDetails) updateData.counter_offer_details = counterOfferDetails
      if (counterOfferPrice) updateData.counter_offer_price = counterOfferPrice
    }
    
    const { data, error } = await supabase
      .from('booking_requests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    // Send notification when user chooses "sort out personally"
    if (status === 'settled_offline') {
      try {
        await supabase
          .from('messages')
          .insert({
            sender_id: data.user_id,
            receiver_id: data.vendor_id,
            content: `Customer has chosen to settle payment personally. Please confirm once payment is received.`,
            is_read: false
          })
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
        // Don't fail the main operation if notification fails
      }
    }

    return data as BookingRequestRecord
  }
}
