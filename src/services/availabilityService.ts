import { supabase } from '../lib/supabase'

export type AvailabilitySettingsRecord = {
  id: string
  vendor_id: string
  slots_per_day: number
  days_off: Record<string, boolean>
  created_at?: string
  updated_at?: string
}

export type BlockedDateRecord = {
  id: string
  vendor_id: string
  date: string
  reason?: string | null
  created_at?: string
}

export class AvailabilityService {
  static async getSettings(vendorId: string): Promise<AvailabilitySettingsRecord | null> {
    const { data, error } = await supabase
      .from('availability_settings')
      .select('*')
      .eq('vendor_id', vendorId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return (data || null) as any
  }

  static async upsertSettings(payload: Omit<AvailabilitySettingsRecord, 'id' | 'created_at' | 'updated_at'>): Promise<AvailabilitySettingsRecord> {
    const { data, error } = await supabase
      .from('availability_settings')
      .upsert(payload)
      .select()
      .single()

    if (error) throw error
    return data as AvailabilitySettingsRecord
  }

  static async listBlockedDates(vendorId: string, monthStart?: string, monthEnd?: string): Promise<BlockedDateRecord[]> {
    let query = supabase
      .from('blocked_dates')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('date', { ascending: true })

    if (monthStart && monthEnd) {
      query = query.gte('date', monthStart).lte('date', monthEnd)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as BlockedDateRecord[]
  }

  static async addBlockedDates(vendorId: string, dates: string[], reason?: string): Promise<void> {
    const payload = dates.map(date => ({
      vendor_id: vendorId,
      date,
      reason
    }))

    const { error } = await supabase
      .from('blocked_dates')
      .insert(payload)

    if (error) throw error
  }

  static async removeBlockedDates(vendorId: string, dates: string[]): Promise<void> {
    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('vendor_id', vendorId)
      .in('date', dates)

    if (error) throw error
  }
}

