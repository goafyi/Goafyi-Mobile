/**
 * R2 Service for React Native
 * Handles direct uploads to Cloudflare R2 using AWS SDK
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export class R2Service {
  private static client: S3Client | null = null;

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
  
  private static getClient(): S3Client {
    if (!this.client) {
      const endpoint = `https://${process.env.EXPO_PUBLIC_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      
      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY!,
        },
      });
    }
    
    return this.client;
  }

  /**
   * Upload image directly to R2
   */
  static async uploadImage(imageUri: string, fileName: string): Promise<string> {
    try {
      // Convert image URI to buffer
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (buffer.length > maxSize) {
        throw new Error('File too large. Maximum size is 5MB.');
      }

      const command = new PutObjectCommand({
        Bucket: process.env.EXPO_PUBLIC_R2_BUCKET,
        Key: fileName,
        Body: buffer,
        ContentType: 'image/jpeg',
      });

      await this.getClient().send(command);

          // Return public URL
          const publicBaseUrl = this.getCleanR2BaseUrl();
          const publicUrl = `${publicBaseUrl}/${fileName}`;

          console.log('R2Service: Generated public URL:', publicUrl);
          console.log('R2Service: Base URL (cleaned):', publicBaseUrl);
          console.log('R2Service: File name:', fileName);

      return publicUrl;
    } catch (error) {
      console.error('R2Service.uploadImage error:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple images to R2
   */
  static async uploadImages(vendorId: string, imageUris: string[]): Promise<string[]> {
    try {
      const uploadedUrls: string[] = [];
      
      for (const imageUri of imageUris) {
        const fileName = `vendors/${vendorId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const publicUrl = await this.uploadImage(imageUri, fileName);
        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('R2Service.uploadImages error:', error);
      throw error;
    }
  }

  /**
   * Delete image from R2
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      const bucketName = process.env.EXPO_PUBLIC_R2_BUCKET;
      if (!bucketName) {
        throw new Error('R2 bucket name is not configured (EXPO_PUBLIC_R2_BUCKET)');
      }

      // Extract the key (file path) from the public URL
      const publicBaseUrl = this.getCleanR2BaseUrl();
      if (!imageUrl.startsWith(publicBaseUrl)) {
        throw new Error('Invalid R2 image URL.');
      }
      const key = imageUrl.substring(publicBaseUrl.length + 1); // +1 to remove the trailing slash

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.getClient().send(command);
    } catch (error) {
      console.error('R2Service.deleteImage error:', error);
      throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if R2 credentials are configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.EXPO_PUBLIC_R2_ACCOUNT_ID &&
      process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID &&
      process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY &&
      process.env.EXPO_PUBLIC_R2_BUCKET &&
      process.env.EXPO_PUBLIC_R2_PUBLIC_BASE_URL
    );
  }

  /**
   * Get configuration status for debugging
   */
  static getConfigStatus(): { configured: boolean; missing: string[] } {
    const required = [
      'EXPO_PUBLIC_R2_ACCOUNT_ID',
      'EXPO_PUBLIC_R2_ACCESS_KEY_ID', 
      'EXPO_PUBLIC_R2_SECRET_ACCESS_KEY',
      'EXPO_PUBLIC_R2_BUCKET',
      'EXPO_PUBLIC_R2_PUBLIC_BASE_URL'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    return {
      configured: missing.length === 0,
      missing
    };
  }
}
