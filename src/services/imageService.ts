/**
 * Image Service for React Native
 * Handles image URLs from Supabase and Cloudflare R2
 */

export class ImageService {
  // Base URLs for different image sources
  private static readonly SUPABASE_BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private static readonly R2_PUBLIC_BASE_URL = this.getCleanR2BaseUrl();
  
  static {
    console.log('ImageService: R2_PUBLIC_BASE_URL from env:', process.env.EXPO_PUBLIC_R2_PUBLIC_BASE_URL);
    console.log('ImageService: R2_PUBLIC_BASE_URL final (cleaned):', this.R2_PUBLIC_BASE_URL);
  }

  /**
   * Get clean R2 base URL by removing any template paths
   */
  private static getCleanR2BaseUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_R2_PUBLIC_BASE_URL;
    if (!envUrl) {
      return 'https://pub-f1e2b2246c304d95b39e0f408f4e1235.r2.dev'; // fallback
    }
    
    // Remove any template paths like /vendors/[vendor-id]/[filename]
    const cleanUrl = envUrl.replace(/\/vendors\/\[vendor-id\]\/\[filename\].*$/, '');
    return cleanUrl;
  }

  /**
   * Get a properly formatted image URL
   * Handles both Supabase storage URLs and Cloudflare R2 URLs
   */
  static getImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return 'https://via.placeholder.com/400x300?text=No+Image';
    }

    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If it's a Supabase storage path
    if (imageUrl.startsWith('vendor-images/') || imageUrl.startsWith('avatars/')) {
      if (this.SUPABASE_BASE_URL) {
        return `${this.SUPABASE_BASE_URL}/storage/v1/object/public/${imageUrl}`;
      }
    }

    // If it's a Cloudflare R2 path
    if (imageUrl.startsWith('portfolio/') || imageUrl.startsWith('uploads/')) {
      return `${this.R2_PUBLIC_BASE_URL}/${imageUrl}`;
    }

    // Default fallback
    return imageUrl;
  }

  /**
   * Get profile picture URL (from Supabase storage)
   */
  static getProfilePictureUrl(avatarUrl: string | null | undefined): string {
    if (!avatarUrl) {
      return 'https://via.placeholder.com/100x100?text=U';
    }

    // If it's already a full URL, return as is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    // If it's a Supabase storage path
    if (this.SUPABASE_BASE_URL) {
      return `${this.SUPABASE_BASE_URL}/storage/v1/object/public/vendor-images/${avatarUrl}`;
    }

    return avatarUrl;
  }

  /**
   * Get portfolio image URL (from Cloudflare R2)
   */
  static getPortfolioImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return 'https://via.placeholder.com/400x300?text=No+Image';
    }

    // First, try to fix any malformed URLs
    const fixedUrl = this.fixMalformedR2Url(imageUrl);

    // If it's already a full URL, return as is
    if (fixedUrl.startsWith('http://') || fixedUrl.startsWith('https://')) {
      console.log('ImageService: Using full URL:', fixedUrl);
      return fixedUrl;
    }

    // If it's a Cloudflare R2 path
    const finalUrl = `${this.R2_PUBLIC_BASE_URL}/${fixedUrl}`;
    console.log('ImageService: Generated R2 URL:', finalUrl);
    console.log('ImageService: R2 Base URL:', this.R2_PUBLIC_BASE_URL);
    console.log('ImageService: Input URL:', fixedUrl);
    return finalUrl;
  }

  /**
   * Fix malformed R2 URLs that have double paths
   */
  static fixMalformedR2Url(url: string): string {
    // Check if URL contains the malformed pattern
    if (url.includes('/vendors/[vendor-id]/[filename]/vendors/')) {
      // Extract the correct path after the malformed part
      const parts = url.split('/vendors/[vendor-id]/[filename]/vendors/');
      if (parts.length > 1) {
        const correctPath = `vendors/${parts[1]}`;
        const baseUrl = this.getCleanR2BaseUrl();
        const fixedUrl = `${baseUrl}/${correctPath}`;
        console.log('ImageService: Fixed malformed URL:', url, '->', fixedUrl);
        return fixedUrl;
      }
    }
    return url;
  }

  /**
   * Test if an R2 URL is accessible
   */
  static async testR2Url(url: string): Promise<boolean> {
    try {
      console.log('ImageService: Testing R2 URL:', url);
      const response = await fetch(url, { method: 'HEAD' });
      const isAccessible = response.ok;
      console.log('ImageService: R2 URL accessible:', isAccessible, 'Status:', response.status);
      return isAccessible;
    } catch (error) {
      console.error('ImageService: R2 URL test failed:', error);
      return false;
    }
  }

  /**
   * Get fallback image URL
   */
  static getFallbackImageUrl(type: 'profile' | 'portfolio' | 'cover' = 'portfolio'): string {
    switch (type) {
      case 'profile':
        return 'https://via.placeholder.com/100x100?text=U';
      case 'cover':
        return 'https://via.placeholder.com/400x200?text=Cover+Image';
      default:
        return 'https://via.placeholder.com/400x300?text=No+Image';
    }
  }
}
