import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Export supabase for use in components
export { supabase }

type Vendor = Database['public']['Tables']['vendors']['Row']
type VendorInsert = Database['public']['Tables']['vendors']['Insert']
type VendorUpdate = Database['public']['Tables']['vendors']['Update']

export interface VendorWithUser extends Vendor {
  user: {
    full_name: string | null
    avatar_url: string | null
    phone: string | null
  }
}

export class VendorService {
  // Cache configuration
  private static readonly VENDOR_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private static readonly VENDOR_LIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly VENDOR_CACHE_PREFIX = 'vendor_profile_';
  private static readonly VENDOR_LIST_CACHE_PREFIX = 'vendor_list_';

  // AsyncStorage cache helpers
  private static async getCache<T>(key: string, ttlMs: number): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return null
      if (Date.now() - (parsed.ts || 0) > ttlMs) return null
      return parsed.data as T
    } catch {
      return null
    }
  }

  private static async setCache<T>(key: string, data: T) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
    } catch {
      // ignore quota errors
    }
  }

  // Get minimal vendor list for lightweight listing
  static async getVendorsLite(): Promise<Array<Pick<Vendor, 'id' | 'user_id' | 'business_name' | 'category' | 'portfolio_images' | 'social_media' | 'website' | 'contact_phone'>>> {
    const cacheKey = `${this.VENDOR_LIST_CACHE_PREFIX}lite`;
    const cached = await this.getCache<Array<Pick<Vendor, 'id' | 'user_id' | 'business_name' | 'category' | 'portfolio_images' | 'social_media' | 'website' | 'contact_phone'>>>(cacheKey, this.VENDOR_LIST_CACHE_TTL);
    
    if (cached) {
      // Return cached data immediately
      return cached;
    }

    const { data, error } = await supabase
      .from('vendors')
      .select('id,user_id,business_name,category,portfolio_images,social_media,website,contact_phone')

    if (error) throw error
    
    const result = data as any;
    // Cache the result
    await this.setCache(cacheKey, result);
    
    return result;
  }

  // Get all vendors with pagination and filters
  static async getVendors(options: {
    category?: string
    location?: string
    search?: string
    page?: number
    limit?: number
    sortBy?: 'rating' | 'created_at' | 'business_name'
    sortOrder?: 'asc' | 'desc'
  } = {}) {
    const {
      category,
      location,
      search,
      page = 1,
      limit = 12,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    let query = supabase
      .from('vendors')
      .select(`
        *,
        user:users!vendors_user_id_fkey(full_name, avatar_url, phone)
      `)
      .eq('is_verified', true)

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      vendors: data as VendorWithUser[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }

  // Get vendor by ID
  static async getVendorById(id: string): Promise<VendorWithUser | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        user:users!vendors_user_id_fkey(full_name, avatar_url, phone)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      throw error
    }

    return data as VendorWithUser
  }

  // Cached-first getter for vendor by ID (stale-while-revalidate)
  static async getVendorByIdCachedFirst(id: string, ttlMs: number = this.VENDOR_CACHE_TTL): Promise<VendorWithUser | null> {
    const cacheKey = `${this.VENDOR_CACHE_PREFIX}${id}`;
    const cached = await this.getCache<VendorWithUser | null>(cacheKey, ttlMs);
    
    if (cached !== null) {
      // Refresh in background (stale-while-revalidate pattern)
      this.getVendorById(id)
        .then((fresh) => {
          if (fresh) {
            this.setCache(cacheKey, fresh);
          }
        })
        .catch(() => {
          // Ignore background refresh errors
        });
      return cached;
    }

    // No cache, fetch fresh data
    const fresh = await this.getVendorById(id);
    if (fresh) {
      await this.setCache(cacheKey, fresh);
    }
    return fresh;
  }

  // Get vendor by user ID
  static async getVendorByUserId(userId: string): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  // Cached-first getter for vendor by user ID (stale-while-revalidate)
  static async getVendorByUserIdCachedFirst(userId: string, ttlMs: number = 5 * 60 * 1000): Promise<Vendor | null> {
    const cacheKey = `vendor_by_user_${userId}`
    const cached = await this.getCache<Vendor | null>(cacheKey, ttlMs)
    if (cached !== null) {
      // Refresh in background
      this.getVendorByUserId(userId).then((fresh) => this.setCache(cacheKey, fresh)).catch(() => {})
      return cached
    }
    const fresh = await this.getVendorByUserId(userId)
    await this.setCache(cacheKey, fresh)
    return fresh
  }

  // Get all vendors by user ID
  static async getVendorsByUserId(userId: string): Promise<VendorWithUser[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        user:users!vendors_user_id_fkey(full_name, avatar_url, phone)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as VendorWithUser[]
  }

  // Create vendor profile
  static async createVendor(vendorData: VendorInsert): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .insert(vendorData)
      .select()
      .single()

    if (error) throw error
    // Cache newly created vendor
    try {
      await AsyncStorage.setItem(`vendor_by_user_${(data as any).user_id}`, JSON.stringify({ ts: Date.now(), data }))
    } catch {}
    return data
  }

  // Update vendor profile
  static async updateVendor(id: string, updates: VendorUpdate): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    // Bust cache for this vendor (lookup user_id and update cache)
    try {
      const full = await this.getVendorById(data.id)
      if (full) await AsyncStorage.setItem(`vendor_by_user_${(full as any).user_id}`, JSON.stringify({ ts: Date.now(), data: full }))
    } catch {}
    return data
  }

  // Delete vendor
  static async deleteVendor(id: string): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Get vendor categories
  static async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('category')

    if (error) throw error

    // Get unique categories
    const categories = [...new Set(data.map(item => item.category))]
    return categories.sort()
  }

  // Get vendor locations
  static async getLocations(): Promise<string[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('location')
      .eq('is_verified', true)

    if (error) throw error

    // Get unique locations
    const locations = [...new Set(data.map(item => item.location))]
    return locations.sort()
  }

  // Upload vendor image (React Native version)
  static async uploadVendorImage(vendorId: string, uri: string, fileName: string): Promise<string> {
    const fileExt = fileName.split('.').pop()
    const uploadFileName = `${vendorId}/${Date.now()}.${fileExt}`

    // Convert URI to blob for React Native
    const response = await fetch(uri)
    const blob = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('vendor-images')
      .upload(uploadFileName, blob)

    if (uploadError) throw uploadError

    // Get public URL
    const { data } = supabase.storage
      .from('vendor-images')
      .getPublicUrl(uploadFileName)

    return data.publicUrl
  }

  // Delete vendor image
  static async deleteVendorImage(imageUrl: string): Promise<void> {
    // Extract file path from URL
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const vendorId = urlParts[urlParts.length - 2]

    const { error } = await supabase.storage
      .from('vendor-images')
      .remove([`${vendorId}/${fileName}`])

    if (error) throw error
  }

  // Update vendor portfolio images
  static async updatePortfolioImages(vendorId: string, images: string[]): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .update({ portfolio_images: images })
      .eq('id', vendorId)

    if (error) throw error
    try { 
      await AsyncStorage.setItem(`vendor_cover_${vendorId}`, JSON.stringify({ ts: Date.now(), url: images[0] || null })) 
    } catch {}
    
    // Clear vendor cache when portfolio is updated
    this.clearVendorCache(vendorId);
  }

  // Update vendor portfolio videos
  static async updatePortfolioVideos(vendorId: string, videos: string[]): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .update({ portfolio_videos: videos })
      .eq('id', vendorId)

    if (error) throw error
    
    // Clear vendor cache when portfolio is updated
    this.clearVendorCache(vendorId);
  }

  // Clear cache for a specific vendor
  static async clearVendorCache(vendorId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.VENDOR_CACHE_PREFIX}${vendorId}`);
    } catch {
      // ignore errors
    }
  }

  // Clear all vendor cache
  static async clearAllVendorCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const vendorKeys = keys.filter(key => 
        key.startsWith(this.VENDOR_CACHE_PREFIX) || key.startsWith(this.VENDOR_LIST_CACHE_PREFIX)
      );
      await AsyncStorage.multiRemove(vendorKeys);
    } catch {
      // ignore errors
    }
  }
}
