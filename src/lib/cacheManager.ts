/**
 * Centralized Cache Management System for React Native
 * 
 * This module provides a unified interface for managing all caches in the application.
 * It ensures consistent cache keys, TTL values, and clearing behavior using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheConfig {
  key: string
  ttl: number // Time to live in milliseconds
  storage: 'asyncStorage' | 'memory'
}

export interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
}

// Cache key prefixes for consistency
export const CACHE_KEYS = {
  // Authentication caches
  USER_PROFILE: 'user_profile_',
  VENDOR_ID: 'vendor_id_',
  AVATAR_URL: 'avatar_url_',
  
  // Vendor data caches
  VENDOR_PROFILE: 'vendor_profile_',
  VENDOR_LIST: 'vendor_list_',
  LANDING_VENDORS: 'landing_vendors_cache_',
  
  // App-specific caches
  AVAILABILITY_SETTINGS: 'availability_settings',
  GOA_FYI_CACHE: 'goa-fyi-cache-',
  // Admin-specific UI/session flags
  ADMIN_SESSION: 'admin_session_',
  ADMIN_USER: 'admin_user_',
  // Ratings caches (to centralize clearing on sign out)
  VENDOR_RATING: 'vendor_rating_',
  VENDOR_RATING_STATS: 'vendor_rating_stats_',
  
  // Supabase session keys (these start with 'sb-')
  SUPABASE_SESSION: 'sb-'
} as const

// Cache configurations
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Authentication caches (30 seconds)
  USER_PROFILE: { key: CACHE_KEYS.USER_PROFILE, ttl: 30000, storage: 'memory' },
  VENDOR_ID: { key: CACHE_KEYS.VENDOR_ID, ttl: 300000, storage: 'memory' }, // 5 minutes
  AVATAR_URL: { key: CACHE_KEYS.AVATAR_URL, ttl: 7 * 24 * 60 * 60 * 1000, storage: 'asyncStorage' }, // 7 days
  
  // Vendor data caches
  VENDOR_PROFILE: { key: CACHE_KEYS.VENDOR_PROFILE, ttl: 10 * 60 * 1000, storage: 'asyncStorage' }, // 10 minutes
  VENDOR_LIST: { key: CACHE_KEYS.VENDOR_LIST, ttl: 5 * 60 * 1000, storage: 'asyncStorage' }, // 5 minutes
  LANDING_VENDORS: { key: CACHE_KEYS.LANDING_VENDORS, ttl: 5 * 60 * 1000, storage: 'asyncStorage' }, // 5 minutes
  
  // App-specific caches
  AVAILABILITY_SETTINGS: { key: CACHE_KEYS.AVAILABILITY_SETTINGS, ttl: Infinity, storage: 'asyncStorage' }, // Persistent until cleared
  GOA_FYI_CACHE: { key: CACHE_KEYS.GOA_FYI_CACHE, ttl: 5 * 60 * 1000, storage: 'asyncStorage' }, // 5 minutes
  // Ratings: keep TTL aligned with RatingService (5 minutes)
  VENDOR_RATING: { key: CACHE_KEYS.VENDOR_RATING, ttl: 5 * 60 * 1000, storage: 'asyncStorage' },
  VENDOR_RATING_STATS: { key: CACHE_KEYS.VENDOR_RATING_STATS, ttl: 5 * 60 * 1000, storage: 'asyncStorage' },
  // Admin caches (session-bound)
  ADMIN_SESSION: { key: CACHE_KEYS.ADMIN_SESSION, ttl: Infinity, storage: 'asyncStorage' },
  ADMIN_USER: { key: CACHE_KEYS.ADMIN_USER, ttl: Infinity, storage: 'asyncStorage' },
  // App version key for deploy-wide cache invalidation
  APP_VERSION: { key: 'app_version_', ttl: Infinity, storage: 'asyncStorage' },
} as const

// In-memory cache storage
const memoryCache = new Map<string, CacheItem>()

export class CacheManager {
  /**
   * Set a cache item
   */
  static async set<T>(configKey: string, identifier: string, data: T): Promise<void> {
    const config = CACHE_CONFIGS[configKey]
    if (!config) {
      console.warn(`⚠️ CacheManager: Unknown cache config key: ${configKey}`)
      return
    }

    const fullKey = `${config.key}${identifier}`
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl
    }

    try {
      switch (config.storage) {
        case 'asyncStorage':
          await AsyncStorage.setItem(fullKey, JSON.stringify(item))
          break
        case 'memory':
          memoryCache.set(fullKey, item)
          break
      }
      console.log(`✅ CacheManager: Cached ${configKey} for ${identifier}`)
    } catch (error) {
      console.warn(`⚠️ CacheManager: Failed to cache ${configKey} for ${identifier}:`, error)
    }
  }

  /**
   * Get a cache item
   */
  static async get<T>(configKey: string, identifier: string): Promise<T | null> {
    const config = CACHE_CONFIGS[configKey]
    if (!config) {
      console.warn(`⚠️ CacheManager: Unknown cache config key: ${configKey}`)
      return null
    }

    const fullKey = `${config.key}${identifier}`

    try {
      let item: CacheItem<T> | null = null

      switch (config.storage) {
        case 'asyncStorage':
          const asyncData = await AsyncStorage.getItem(fullKey)
          if (asyncData) item = JSON.parse(asyncData)
          break
        case 'memory':
          item = memoryCache.get(fullKey) || null
          break
      }

      if (!item) {
        return null
      }

      // Check if expired
      if (config.ttl !== Infinity && Date.now() - item.timestamp > config.ttl) {
        console.log(`🔄 CacheManager: Cache expired for ${configKey} (${identifier})`)
        await this.delete(configKey, identifier)
        return null
      }

      console.log(`✅ CacheManager: Retrieved ${configKey} for ${identifier} from cache`)
      return item.data
    } catch (error) {
      console.warn(`⚠️ CacheManager: Failed to retrieve ${configKey} for ${identifier}:`, error)
      return null
    }
  }

  /**
   * Delete a specific cache item
   */
  static async delete(configKey: string, identifier: string): Promise<void> {
    const config = CACHE_CONFIGS[configKey]
    if (!config) {
      console.warn(`⚠️ CacheManager: Unknown cache config key: ${configKey}`)
      return
    }

    const fullKey = `${config.key}${identifier}`

    try {
      switch (config.storage) {
        case 'asyncStorage':
          await AsyncStorage.removeItem(fullKey)
          break
        case 'memory':
          memoryCache.delete(fullKey)
          break
      }
      console.log(`🧹 CacheManager: Deleted ${configKey} for ${identifier}`)
    } catch (error) {
      console.warn(`⚠️ CacheManager: Failed to delete ${configKey} for ${identifier}:`, error)
    }
  }

  /**
   * Clear all caches for a specific user
   */
  static async clearUserCaches(userId: string): Promise<void> {
    console.log(`🧹 CacheManager: Clearing all caches for user: ${userId}`)
    
    // Clear user-specific caches
    await this.delete('USER_PROFILE', userId)
    await this.delete('VENDOR_ID', userId)
    await this.delete('AVATAR_URL', userId)
    await this.delete('VENDOR_PROFILE', userId)
    
    // Clear availability settings (user-specific)
    await this.delete('AVAILABILITY_SETTINGS', '')
  }

  /**
   * Clear all application caches
   */
  static async clearAllCaches(): Promise<void> {
    console.log(`🧹 CacheManager: Clearing all application caches`)
    
    // Clear memory cache
    memoryCache.clear()
    
    // Clear AsyncStorage caches
    try {
      const keys = await AsyncStorage.getAllKeys()
      const appKeys = keys.filter(key => this.isAppCacheKey(key))
      await AsyncStorage.multiRemove(appKeys)
      console.log(`🧹 CacheManager: Cleared ${appKeys.length} AsyncStorage keys`)
    } catch (error) {
      console.warn(`⚠️ CacheManager: Failed to clear AsyncStorage:`, error)
    }
  }

  /**
   * Clear Supabase session caches
   */
  static async clearSupabaseCaches(): Promise<void> {
    console.log(`🧹 CacheManager: Clearing Supabase session caches`)
    
    try {
      const keys = await AsyncStorage.getAllKeys()
      const supabaseKeys = keys.filter(key => key.startsWith(CACHE_KEYS.SUPABASE_SESSION))
      await AsyncStorage.multiRemove(supabaseKeys)
      console.log(`🧹 CacheManager: Cleared ${supabaseKeys.length} Supabase keys`)
    } catch (error) {
      console.warn(`⚠️ CacheManager: Failed to clear Supabase caches:`, error)
    }
  }

  /**
   * Check if a key is an application cache key
   */
  private static isAppCacheKey(key: string): boolean {
    return Object.values(CACHE_KEYS).some(prefix => key.startsWith(prefix))
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    memory: number
    asyncStorage: number
    total: number
  }> {
    const memory = memoryCache.size
    
    try {
      const keys = await AsyncStorage.getAllKeys()
      const asyncStorageCount = keys.filter(key => this.isAppCacheKey(key)).length
      
      return {
        memory,
        asyncStorage: asyncStorageCount,
        total: memory + asyncStorageCount
      }
    } catch (error) {
      console.warn(`⚠️ CacheManager: Failed to get cache stats:`, error)
      return {
        memory,
        asyncStorage: 0,
        total: memory
      }
    }
  }

  /**
   * Clean up expired caches
   */
  static async cleanupExpiredCaches(): Promise<void> {
    console.log(`🧹 CacheManager: Cleaning up expired caches`)
    
    try {
      const keys = await AsyncStorage.getAllKeys()
      const appKeys = keys.filter(key => this.isAppCacheKey(key))
      
      for (const key of appKeys) {
        try {
          const data = await AsyncStorage.getItem(key)
          if (data) {
            const item: CacheItem = JSON.parse(data)
            if (item.ttl !== Infinity && Date.now() - item.timestamp > item.ttl) {
              await AsyncStorage.removeItem(key)
              console.log(`🧹 CacheManager: Cleaned up expired AsyncStorage: ${key}`)
            }
          }
        } catch (error) {
          // Remove invalid cache entries
          await AsyncStorage.removeItem(key)
          console.log(`🧹 CacheManager: Removed invalid AsyncStorage: ${key}`)
        }
      }
      
      // Clean up memory cache
      for (const [key, item] of memoryCache) {
        if (item.ttl !== Infinity && Date.now() - item.timestamp > item.ttl) {
          memoryCache.delete(key)
          console.log(`🧹 CacheManager: Cleaned up expired memory: ${key}`)
        }
      }
    } catch (error) {
      console.warn(`⚠️ CacheManager: Failed to cleanup expired caches:`, error)
    }
  }
}

// Auto-cleanup expired caches every 5 minutes
setInterval(() => {
  CacheManager.cleanupExpiredCaches()
}, 5 * 60 * 1000)
