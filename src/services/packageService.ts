import { supabase } from '../lib/supabase'

export type PackageRecord = {
  id: string
  vendor_id: string
  title: string
  pricing_type: 'fixed' | 'per_person'
  price?: number | null
  price_per_person?: number | null
  min_persons?: number | null
  duration_label?: string | null
  deliverables?: string[] | null
  terms?: string | null
  created_at?: string
  updated_at?: string
}

export type PackageExtraRecord = {
  id: string
  package_id: string
  name: string
  available_qty?: number | null
  price_per_unit?: number | null
  created_at?: string
  updated_at?: string
}

export class PackageService {
  // Packages
  static async getVendorPackages(vendorId: string): Promise<(PackageRecord & { package_extras: PackageExtraRecord[] })[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*, package_extras(*)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as any
  }

  static async createPackage(payload: Omit<PackageRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PackageRecord> {
    const { data, error } = await supabase
      .from('packages')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data as PackageRecord
  }

  static async updatePackage(id: string, payload: Partial<PackageRecord>): Promise<PackageRecord> {
    const { data, error } = await supabase
      .from('packages')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as PackageRecord
  }

  static async deletePackage(id: string): Promise<void> {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Package Extras
  static async createPackageExtra(payload: Omit<PackageExtraRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PackageExtraRecord> {
    const { data, error } = await supabase
      .from('package_extras')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data as PackageExtraRecord
  }

  static async updatePackageExtra(id: string, payload: Partial<PackageExtraRecord>): Promise<PackageExtraRecord> {
    const { data, error } = await supabase
      .from('package_extras')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as PackageExtraRecord
  }

  static async deletePackageExtra(id: string): Promise<void> {
    const { error } = await supabase
      .from('package_extras')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

