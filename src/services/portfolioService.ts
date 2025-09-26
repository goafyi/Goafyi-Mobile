import { supabase } from '../lib/supabase';
import { VendorService } from './vendorService';
import { R2Service } from './r2Service';

export interface PortfolioImage {
  id: string;
  url: string;
  isCover?: boolean;
}

export interface PortfolioVideo {
  id: string;
  url: string;
  title?: string;
}

export class PortfolioService {
  /**
   * Upload cover picture to Supabase storage
   */
  static async uploadCoverPicture(vendorId: string, imageUri: string): Promise<string> {
    try {
      // Convert image URI to file-like object
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      
      const fileExt = 'jpg'; // We'll always save as JPG
      const fileName = `${vendorId}/cover-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Cover picture upload error:', uploadError);
        throw new Error(`Failed to upload cover picture: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('PortfolioService.uploadCoverPicture error:', error);
      throw error;
    }
  }

  /**
   * Upload portfolio images to Cloudflare R2 (direct upload)
   */
  static async uploadPortfolioImages(vendorId: string, imageUris: string[]): Promise<string[]> {
    try {
      // Check if R2 is configured
      if (!R2Service.isConfigured()) {
        const configStatus = R2Service.getConfigStatus();
        throw new Error(`R2 not configured. Missing: ${configStatus.missing.join(', ')}`);
      }

      // Upload images directly to R2
      const uploadedUrls = await R2Service.uploadImages(vendorId, imageUris);
      return uploadedUrls;
    } catch (error) {
      console.error('PortfolioService.uploadPortfolioImages error:', error);
      throw error;
    }
  }

  /**
   * Delete cover picture from Supabase storage
   */
  static async deleteCoverPicture(imageUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const vendorId = urlParts[urlParts.length - 2];
      const filePath = `${vendorId}/${fileName}`;

      const { error } = await supabase.storage
        .from('vendor-images')
        .remove([filePath]);

      if (error) {
        console.error('Cover picture delete error:', error);
        throw new Error(`Failed to delete cover picture: ${error.message}`);
      }
    } catch (error) {
      console.error('PortfolioService.deleteCoverPicture error:', error);
      throw error;
    }
  }

  /**
   * Delete portfolio image from Cloudflare R2
   */
  static async deletePortfolioImage(imageUrl: string): Promise<void> {
    try {
      await R2Service.deleteImage(imageUrl);
    } catch (error) {
      console.error('PortfolioService.deletePortfolioImage error:', error);
      throw error;
    }
  }

  /**
   * Update vendor's portfolio images in database
   */
  static async updatePortfolioImages(vendorId: string, images: string[]): Promise<void> {
    try {
      await VendorService.updatePortfolioImages(vendorId, images);
    } catch (error) {
      console.error('PortfolioService.updatePortfolioImages error:', error);
      throw error;
    }
  }

  /**
   * Update vendor's portfolio videos in database
   */
  static async updatePortfolioVideos(vendorId: string, videos: string[]): Promise<void> {
    try {
      await VendorService.updateVendor(vendorId, {
        portfolio_videos: videos
      });
    } catch (error) {
      console.error('PortfolioService.updatePortfolioVideos error:', error);
      throw error;
    }
  }

  /**
   * Validate YouTube URL
   */
  static isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[A-Za-z0-9_-]{6,}$/;
    return youtubeRegex.test(url);
  }

  /**
   * Extract YouTube video ID from URL
   */
  static extractYouTubeVideoId(url: string): string | null {
    const idMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
    return idMatch ? idMatch[1] : null;
  }

  /**
   * Generate YouTube thumbnail URL
   */
  static getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
}
