import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VendorRating {
  id: string;
  vendor_id: string;
  reviewer_id: string;
  rating: number; // 1-5
  review_text?: string;
  created_at: string;
  updated_at: string;
}

export interface RatingWithUser extends VendorRating {
  reviewer: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface RatingStats {
  average_rating: number;
  total_ratings: number;
  rating_distribution: {
    rating: number;
    count: number;
  }[];
}

export interface RatingFormData {
  rating: number;
  review_text?: string;
}

export class RatingService {
  // Cache configuration
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly CACHE_PREFIX = 'vendor_rating_';
  private static readonly STATS_CACHE_PREFIX = 'vendor_rating_stats_';

  // AsyncStorage cache helpers
  private static async getCache<T>(key: string, ttlMs: number): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > ttlMs) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  }

  private static async setCache<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch {
      // ignore quota errors
    }
  }

  private static async clearCache(vendorId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.STATS_CACHE_PREFIX}${vendorId}`);
    } catch {
      // ignore errors
    }
  }

  /**
   * Submit a rating and review for a vendor
   * @param vendorId - The ID of the vendor being rated
   * @param reviewerId - The ID of the user submitting the rating
   * @param ratingData - The rating (1-5) and optional review text
   * @returns Promise<VendorRating | null>
   */
  static async submitRating(
    vendorId: string, 
    reviewerId: string, 
    ratingData: RatingFormData
  ): Promise<VendorRating | null> {
    try {
      const { rating, review_text } = ratingData;

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const ratingRecord: Partial<VendorRating> = {
        vendor_id: vendorId,
        reviewer_id: reviewerId,
        rating,
        review_text: (review_text && review_text.trim().length > 0) ? review_text.trim() : undefined,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('vendor_ratings')
        .upsert(ratingRecord, { 
          onConflict: 'vendor_id,reviewer_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting rating:', error);
        return null;
      }

      // Clear cache for this vendor since rating has changed
      await this.clearCache(vendorId);

      return data as VendorRating;
    } catch (error) {
      console.error('Error submitting rating:', error);
      return null;
    }
  }

  /**
   * Get all ratings for a vendor with reviewer information
   * @param vendorId - The ID of the vendor
   * @param page - Page number for pagination
   * @param limit - Number of ratings per page
   * @returns Promise<{ ratings: RatingWithUser[], total: number }>
   */
  static async getVendorRatings(
    vendorId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ ratings: RatingWithUser[], total: number }> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get ratings with pagination
      const { data: ratings, error: ratingsError } = await supabase
        .from('vendor_ratings')
        .select(`
          *,
          reviewer:users!vendor_ratings_reviewer_id_fkey(full_name, avatar_url)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (ratingsError) {
        console.error('Error getting vendor ratings:', ratingsError);
        return { ratings: [], total: 0 };
      }

      // Get total count
      const { count, error: countError } = await supabase
        .from('vendor_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);

      if (countError) {
        console.error('Error getting rating count:', countError);
        return { ratings: ratings as RatingWithUser[], total: 0 };
      }

      return {
        ratings: ratings as RatingWithUser[],
        total: count || 0
      };
    } catch (error) {
      console.error('Error getting vendor ratings:', error);
      return { ratings: [], total: 0 };
    }
  }

  /**
   * Get rating statistics for a vendor
   * @param vendorId - The ID of the vendor
   * @returns Promise<RatingStats | null>
   */
  static async getVendorRatingStats(vendorId: string): Promise<RatingStats | null> {
    try {
      // Check cache first
      const cacheKey = `${this.STATS_CACHE_PREFIX}${vendorId}`;
      const cached = await this.getCache<RatingStats>(cacheKey, this.CACHE_TTL);
      if (cached) {
        return cached;
      }

      // Get all ratings for the vendor
      const { data: ratings, error } = await supabase
        .from('vendor_ratings')
        .select('rating')
        .eq('vendor_id', vendorId);

      if (error) {
        console.error('Error getting rating stats:', error);
        return null;
      }

      if (!ratings || ratings.length === 0) {
        const emptyStats = {
          average_rating: 0,
          total_ratings: 0,
          rating_distribution: []
        };
        // Cache empty result too
        await this.setCache(cacheKey, emptyStats);
        return emptyStats;
      }

      // Calculate average rating
      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = Math.round((totalRating / ratings.length) * 10) / 10;

      // Calculate rating distribution
      const distribution = [5, 4, 3, 2, 1].map(rating => ({
        rating,
        count: ratings.filter(r => r.rating === rating).length
      }));

      const stats = {
        average_rating: averageRating,
        total_ratings: ratings.length,
        rating_distribution: distribution
      };

      // Cache the result
      await this.setCache(cacheKey, stats);

      return stats;
    } catch (error) {
      console.error('Error getting rating stats:', error);
      return null;
    }
  }

  /**
   * Get user's rating for a vendor
   * @param vendorId - The ID of the vendor
   * @param userId - The ID of the user
   * @returns Promise<VendorRating | null>
   */
  static async getUserRating(vendorId: string, userId: string): Promise<VendorRating | null> {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}${vendorId}_${userId}`;
      const cached = await this.getCache<VendorRating | null>(cacheKey, this.CACHE_TTL);
      if (cached !== null) {
        return cached;
      }

      const { data, error } = await supabase
        .from('vendor_ratings')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('reviewer_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rating found - cache null result
          await this.setCache(cacheKey, null);
          return null;
        }
        console.error('Error getting user rating:', error);
        return null;
      }

      const rating = data as VendorRating;
      // Cache the result
      await this.setCache(cacheKey, rating);

      return rating;
    } catch (error) {
      console.error('Error getting user rating:', error);
      return null;
    }
  }

  /**
   * Update an existing rating
   * @param ratingId - The ID of the rating to update
   * @param ratingData - The new rating data
   * @returns Promise<VendorRating | null>
   */
  static async updateRating(
    ratingId: string, 
    ratingData: RatingFormData
  ): Promise<VendorRating | null> {
    try {
      const { rating, review_text } = ratingData;

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const { data, error } = await supabase
        .from('vendor_ratings')
        .update({
          rating,
          review_text: (review_text && review_text.trim().length > 0) ? review_text.trim() : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', ratingId)
        .select()
        .single();

      if (error) {
        console.error('Error updating rating:', error);
        return null;
      }

      // Clear cache for this vendor since rating has changed
      await this.clearCache(data.vendor_id);

      return data as VendorRating;
    } catch (error) {
      console.error('Error updating rating:', error);
      return null;
    }
  }

  /**
   * Delete a rating
   * @param ratingId - The ID of the rating to delete
   * @returns Promise<boolean>
   */
  static async deleteRating(ratingId: string): Promise<boolean> {
    try {
      // First get the rating to know which vendor's cache to clear
      const { data: rating, error: fetchError } = await supabase
        .from('vendor_ratings')
        .select('vendor_id')
        .eq('id', ratingId)
        .single();

      if (fetchError) {
        console.error('Error fetching rating for deletion:', fetchError);
        return false;
      }

      const { error } = await supabase
        .from('vendor_ratings')
        .delete()
        .eq('id', ratingId);

      if (error) {
        console.error('Error deleting rating:', error);
        return false;
      }

      // Clear cache for this vendor since rating has changed
      if (rating) {
        await this.clearCache(rating.vendor_id);
      }

      return true;
    } catch (error) {
      console.error('Error deleting rating:', error);
      return false;
    }
  }

  /**
   * Clear all rating cache (useful for debugging or forced refresh)
   */
  static async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ratingKeys = keys.filter(key => 
        key.startsWith(this.CACHE_PREFIX) || key.startsWith(this.STATS_CACHE_PREFIX)
      );
      await AsyncStorage.multiRemove(ratingKeys);
    } catch {
      // ignore errors
    }
  }
}
