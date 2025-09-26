import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Alert, 
  TextInput, 
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { 
  Camera, 
  Image as ImageIcon, 
  Video, 
  X, 
  Plus, 
  Upload,
  Play,
  Trash2
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { PortfolioService } from '../services/portfolioService';
import { ImageService } from '../services/imageService';

interface PortfolioManagerProps {
  vendorId: string;
  currentImages: string[];
  currentVideos: string[];
  onImagesUpdate: (images: string[]) => void;
  onVideosUpdate: (videos: string[]) => void;
  disabled?: boolean;
}

export function PortfolioManager({
  vendorId,
  currentImages,
  currentVideos,
  onImagesUpdate,
  onVideosUpdate,
  disabled = false
}: PortfolioManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);

  const maxImages = 5;
  const maxVideos = 2;
  const canAddImages = currentImages.length < maxImages;
  const canAddVideos = currentVideos.length < maxVideos;

  // Helper function to extract YouTube video ID
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getYouTubeEmbedUrl = (videoId: string): string => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&showinfo=0&rel=0&modestbranding=1`;
  };

  const handleImagePicker = async (source: 'camera' | 'gallery') => {
    if (disabled || !canAddImages) return;

    try {
      setUploading(true);
      
      let result: ImagePicker.ImagePickerResult;
      
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Photo library permission is required to select images.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          allowsMultipleSelection: true,
        });
      }

      if (!result.canceled) {
        const imageUris = Array.isArray(result.assets) 
          ? result.assets.map(asset => asset.uri)
          : [result.assets[0].uri];

        // Upload images
        const uploadedUrls = await PortfolioService.uploadPortfolioImages(vendorId, imageUris);
        
        // Update portfolio images
        const newImages = [...currentImages, ...uploadedUrls];
        onImagesUpdate(newImages);
        
        // Update database
        await PortfolioService.updatePortfolioImages(vendorId, newImages);
        
        Alert.alert('Success', `${uploadedUrls.length} image(s) uploaded successfully!`);
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverPictureUpload = async (source: 'camera' | 'gallery') => {
    if (disabled) return;

    try {
      setUploading(true);
      
      let result: ImagePicker.ImagePickerResult;
      
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Photo library permission is required to select images.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      }

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        
        // Upload cover picture
        const coverUrl = await PortfolioService.uploadCoverPicture(vendorId, imageUri);
        
        // Update portfolio images (cover is first image)
        const newImages = [coverUrl, ...currentImages.filter((_, index) => index !== 0)];
        onImagesUpdate(newImages);
        
        // Update database
        await PortfolioService.updatePortfolioImages(vendorId, newImages);
        
        Alert.alert('Success', 'Cover picture updated successfully!');
      }
    } catch (error: any) {
      console.error('Cover picture upload error:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload cover picture');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (index: number) => {
    if (disabled) return;

    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true);
              
              const imageUrl = currentImages[index];
              const isCover = index === 0;
              
              if (isCover) {
                await PortfolioService.deleteCoverPicture(imageUrl);
              } else {
                await PortfolioService.deletePortfolioImage(imageUrl);
              }
              
              // Update images array
              const newImages = currentImages.filter((_, i) => i !== index);
              onImagesUpdate(newImages);
              
              // Update database
              await PortfolioService.updatePortfolioImages(vendorId, newImages);
              
              Alert.alert('Success', 'Image deleted successfully!');
            } catch (error: any) {
              console.error('Image delete error:', error);
              Alert.alert('Delete Error', error.message || 'Failed to delete image');
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  };

  const handleAddVideo = () => {
    if (!newVideoUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a YouTube video URL');
      return;
    }

    if (!PortfolioService.isValidYouTubeUrl(newVideoUrl)) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube URL');
      return;
    }

    if (currentVideos.includes(newVideoUrl)) {
      Alert.alert('Duplicate Video', 'This video is already in your portfolio');
      return;
    }

    const newVideos = [...currentVideos, newVideoUrl];
    onVideosUpdate(newVideos);
    setNewVideoUrl('');
    setShowVideoInput(false);
  };

  const handleDeleteVideo = async (index: number) => {
    if (disabled) return;

    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true);
              
              const newVideos = currentVideos.filter((_, i) => i !== index);
              onVideosUpdate(newVideos);
              
              // Update database
              await PortfolioService.updatePortfolioVideos(vendorId, newVideos);
              
              Alert.alert('Success', 'Video deleted successfully!');
            } catch (error: any) {
              console.error('Video delete error:', error);
              Alert.alert('Delete Error', error.message || 'Failed to delete video');
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  };

  const renderImagePicker = () => (
    <View style={styles.imagePickerContainer}>
      {!disabled && (
        <>
          <TouchableOpacity
            style={[styles.imagePickerButton, disabled && styles.disabledButton]}
            onPress={() => handleImagePicker('gallery')}
            disabled={disabled || !canAddImages}
          >
            <ImageIcon size={20} color={disabled || !canAddImages ? '#9ca3af' : '#be185d'} />
            <Text style={[styles.imagePickerText, disabled && styles.disabledText]}>
              Add Images ({currentImages.length}/{maxImages})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.imagePickerButton, disabled && styles.disabledButton]}
            onPress={() => handleImagePicker('camera')}
            disabled={disabled || !canAddImages}
          >
            <Camera size={20} color={disabled || !canAddImages ? '#9ca3af' : '#be185d'} />
            <Text style={[styles.imagePickerText, disabled && styles.disabledText]}>
              Take Photo
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderCoverPictureSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cover Picture</Text>
      <Text style={styles.sectionSubtitle}>This will be the main image shown on your profile</Text>
      
      {currentImages.length > 0 ? (
        <View style={styles.coverContainer}>
          <Image 
            source={{ uri: ImageService.getPortfolioImageUrl(currentImages[0]) }} 
            style={styles.coverImage}
            onError={(error) => {
              console.error('Cover image load error:', error);
              console.log('Cover image URL:', ImageService.getPortfolioImageUrl(currentImages[0]));
            }}
            onLoad={() => {
              console.log('Cover image loaded successfully:', ImageService.getPortfolioImageUrl(currentImages[0]));
            }}
          />
          {!disabled && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteImage(0)}
              disabled={disabled}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.coverPlaceholder}>
          <ImageIcon size={40} color="#9ca3af" />
          <Text style={styles.placeholderText}>No cover picture</Text>
        </View>
      )}
      
      {!disabled && (
        <View style={styles.coverActions}>
          <TouchableOpacity
            style={[styles.actionButton, disabled && styles.disabledButton]}
            onPress={() => handleCoverPictureUpload('gallery')}
            disabled={disabled}
          >
            <ImageIcon size={16} color={disabled ? '#9ca3af' : '#be185d'} />
            <Text style={[styles.actionButtonText, disabled && styles.disabledText]}>
              Choose Cover
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, disabled && styles.disabledButton]}
            onPress={() => handleCoverPictureUpload('camera')}
            disabled={disabled}
          >
            <Camera size={16} color={disabled ? '#9ca3af' : '#be185d'} />
            <Text style={[styles.actionButtonText, disabled && styles.disabledText]}>
              Take Cover
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPortfolioImages = () => {
    console.log('PortfolioManager: currentImages array:', currentImages);
    console.log('PortfolioManager: currentImages length:', currentImages.length);
    
    return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Portfolio Images</Text>
      <Text style={styles.sectionSubtitle}>Add up to {maxImages} images to showcase your work</Text>
      
      {renderImagePicker()}
      
      {currentImages.length > 1 && (
        <View style={styles.imagesGrid}>
          {currentImages.slice(1).map((imageUrl, index) => (
            <View key={index} style={styles.imageGridItem}>
              <Image 
                source={{ uri: ImageService.getPortfolioImageUrl(imageUrl) }} 
                style={styles.portfolioImage}
                onError={(error) => {
                  console.error('Portfolio image load error:', error);
                  console.log('Portfolio image URL:', ImageService.getPortfolioImageUrl(imageUrl));
                }}
                onLoad={() => {
                  console.log('Portfolio image loaded successfully:', ImageService.getPortfolioImageUrl(imageUrl));
                  // Test if the URL is accessible
                  ImageService.testR2Url(ImageService.getPortfolioImageUrl(imageUrl));
                }}
              />
              {!disabled && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteImage(index + 1)}
                  disabled={disabled}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

  const renderVideosSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>YouTube Videos</Text>
      <Text style={styles.sectionSubtitle}>Add up to {maxVideos} YouTube video links</Text>
      
      {!disabled && canAddVideos && (
        <TouchableOpacity
          style={[styles.addVideoButton, disabled && styles.disabledButton]}
          onPress={() => setShowVideoInput(true)}
          disabled={disabled}
        >
          <Plus size={20} color={disabled ? '#9ca3af' : '#be185d'} />
          <Text style={[styles.addVideoText, disabled && styles.disabledText]}>
            Add Video ({currentVideos.length}/{maxVideos})
          </Text>
        </TouchableOpacity>
      )}
      
      {!disabled && showVideoInput && (
        <View style={styles.videoInputContainer}>
          <TextInput
            style={styles.videoInput}
            placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
            value={newVideoUrl}
            onChangeText={setNewVideoUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor="#9ca3af"
          />
          <View style={styles.videoInputActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setNewVideoUrl('');
                setShowVideoInput(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddVideo}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {currentVideos.map((videoUrl, index) => {
        const videoId = extractYouTubeVideoId(videoUrl);
        
        return (
          <View key={index} style={styles.videoItem}>
            {videoId ? (
              <View style={styles.videoWebViewContainer}>
                <WebView
                  source={{ uri: getYouTubeEmbedUrl(videoId) }}
                  style={styles.videoWebView}
                  allowsFullscreenVideo={true}
                  mediaPlaybackRequiresUserAction={false}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={styles.videoLoadingContainer}>
                      <ActivityIndicator size="small" color="#be185d" />
                      <Text style={styles.videoLoadingText}>Loading video...</Text>
                    </View>
                  )}
                />
                {!disabled && (
                  <TouchableOpacity
                    style={styles.deleteVideoButton}
                    onPress={() => handleDeleteVideo(index)}
                    disabled={disabled}
                  >
                    <Trash2 size={16} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.videoItem}>
                <View style={styles.videoThumbnail}>
                  <View style={styles.videoThumbnailPlaceholder}>
                    <Video size={24} color="#9ca3af" />
                  </View>
                  <View style={styles.playButton}>
                    <Play size={16} color="white" />
                  </View>
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>
                    Video {index + 1}
                  </Text>
                  <Text style={styles.videoUrl} numberOfLines={2}>
                    {videoUrl}
                  </Text>
                </View>
                {!disabled && (
                  <TouchableOpacity
                    style={styles.deleteVideoButton}
                    onPress={() => handleDeleteVideo(index)}
                    disabled={disabled}
                  >
                    <Trash2 size={16} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  if (uploading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#be185d" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderCoverPictureSection()}
      {renderPortfolioImages()}
      {renderVideosSection()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  
  // Cover Picture Styles
  coverContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
  coverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  
  // Portfolio Images Styles
  imagePickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fce7f3',
    borderRadius: 8,
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#be185d',
  },
  imagesScroll: {
    marginTop: 8,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  imageItem: {
    position: 'relative',
    marginRight: 12,
  },
  imageGridItem: {
    position: 'relative',
    width: '48%',
    aspectRatio: 1,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  
  // Videos Styles
  addVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fce7f3',
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  addVideoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#be185d',
  },
  videoInputContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  videoInput: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  videoInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#be185d',
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  videoItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  videoWebViewContainer: {
    position: 'relative',
  },
  videoWebView: {
    height: 200,
    width: '100%',
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoLoadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  videoThumbnail: {
    position: 'relative',
    width: 80,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  videoUrl: {
    fontSize: 12,
    color: '#6b7280',
  },
  deleteVideoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    zIndex: 1,
  },
  
  // Common Styles
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fce7f3',
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#be185d',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  disabledText: {
    color: '#9ca3af',
  },
});
