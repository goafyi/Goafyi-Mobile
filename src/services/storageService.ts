/**
 * Storage Service for React Native
 * Handles file uploads to Supabase Storage
 */

import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export class StorageService {
  /**
   * Upload profile picture to Supabase Storage
   */
  static async uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${userId}/${timestamp}.jpg`;
      
      // For React Native, we need to convert the image URI to a file-like object
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true // Replace existing file
        });

      if (uploadError) {
        console.error('Profile picture upload error:', uploadError);
        throw new Error(`Failed to upload profile picture: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('StorageService.uploadProfilePicture error:', error);
      throw error;
    }
  }

  /**
   * Delete profile picture from Supabase Storage
   */
  static async deleteProfilePicture(imageUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userId = urlParts[urlParts.length - 2];
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('vendor-images')
        .remove([filePath]);

      if (error) {
        console.error('Profile picture delete error:', error);
        throw new Error(`Failed to delete profile picture: ${error.message}`);
      }
    } catch (error) {
      console.error('StorageService.deleteProfilePicture error:', error);
      throw error;
    }
  }

  /**
   * Upload vendor image to Supabase Storage
   */
  static async uploadVendorImage(vendorId: string, imageUri: string): Promise<string> {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${vendorId}/${timestamp}.jpg`;
      
      // For React Native, we need to convert the image URI to a file-like object
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true // Replace existing file
        });

      if (uploadError) {
        console.error('Vendor image upload error:', uploadError);
        throw new Error(`Failed to upload vendor image: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('StorageService.uploadVendorImage error:', error);
      throw error;
    }
  }

  /**
   * Delete vendor image from Supabase Storage
   */
  static async deleteVendorImage(imageUrl: string): Promise<void> {
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
        console.error('Vendor image delete error:', error);
        throw new Error(`Failed to delete vendor image: ${error.message}`);
      }
    } catch (error) {
      console.error('StorageService.deleteVendorImage error:', error);
      throw error;
    }
  }

  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      // Request media library permissions
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Pick image from gallery
   */
  static async pickImageFromGallery(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera and media library permissions are required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.8, // Compress image to 80% quality
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      throw error;
    }
  }

  /**
   * Take photo with camera
   */
  static async takePhotoWithCamera(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera and media library permissions are required');
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.8, // Compress image to 80% quality
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  }

  /**
   * Show image picker options (camera or gallery)
   */
  static async showImagePickerOptions(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera and media library permissions are required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.8, // Compress image to 80% quality
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      throw error;
    }
  }
}
