import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, Image, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Phone, Globe, Facebook, Instagram, Camera, LogOut, Save, Edit3, ArrowLeft, X, Play } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { VendorService } from '../services/vendorService';
import { ImageService } from '../services/imageService';
import { StorageService } from '../services/storageService';
import { PortfolioManager } from '../components/PortfolioManager';
import { CATEGORIES } from '../constants';

interface AccountScreenProps {
  navigation?: any;
}

export default function AccountScreen({ navigation }: AccountScreenProps) {
  const { user, updateProfile, signOut } = useSupabase();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  console.log('AccountScreen: user data:', user);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    website: '',
    facebook: '',
    instagram: '',
    businessName: '',
    category: '',
  });

  // Business categories selection
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        website: '',
        facebook: '',
        instagram: '',
        businessName: '',
        category: '',
      });
    }
  }, [user]);

  // Load vendor data if user is a vendor
  useEffect(() => {
    const loadVendorData = async () => {
      if (!user || user.role !== 'vendor') {
        setVendorLoading(false);
        return;
      }

      try {
        setVendorLoading(true);
        const vendorData = await VendorService.getVendorByUserId(user.id);
        console.log('AccountScreen: vendor data loaded:', vendorData);
        setVendor(vendorData);
        
        if (vendorData) {
          console.log('AccountScreen: vendorData.contact_phone:', vendorData.contact_phone);
          console.log('AccountScreen: vendorData.social_media:', vendorData.social_media);
          console.log('AccountScreen: vendorData.social_media?.instagram:', vendorData.social_media?.instagram);
          
          const newFormData = {
            ...formData,
            businessName: vendorData.business_name || '',
            category: vendorData.category || '',
            website: vendorData.website || '',
            phone: vendorData.contact_phone || '',
            facebook: vendorData.social_media?.facebook || '',
            instagram: vendorData.social_media?.instagram || '',
          };
          
          console.log('AccountScreen: Setting formData.phone to:', newFormData.phone);
          console.log('AccountScreen: Setting formData.instagram to:', newFormData.instagram);
          
          setFormData(newFormData);

          // Parse categories
          const types = (vendorData.category || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          setSelectedTypes(types);
        }
      } catch (error) {
        console.error('Error loading vendor data:', error);
      } finally {
        setVendorLoading(false);
      }
    };

    loadVendorData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update user profile
      await updateProfile({
        full_name: formData.fullName,
        phone: formData.phone,
      });

      // Update vendor profile if user is a vendor
      if (user.role === 'vendor' && vendor) {
        const updates = {
          business_name: formData.businessName,
          contact_phone: formData.phone || null,
          website: formData.website || null,
          social_media: {
            facebook: formData.facebook || null,
            instagram: formData.instagram || null
          },
          category: selectedTypes.join(', '),
        };

        console.log('AccountScreen: Saving vendor updates:', updates);
        await VendorService.updateVendor(vendor.id, updates);
        
        // Refresh vendor data after successful update
        const updatedVendorData = await VendorService.getVendorByUserId(user.id);
        console.log('AccountScreen: Refreshed vendor data after save:', updatedVendorData);
        setVendor(updatedVendorData);
        
        // Update formData with the refreshed data
        if (updatedVendorData) {
          setFormData(prev => ({
            ...prev,
            businessName: updatedVendorData.business_name || '',
            category: updatedVendorData.category || '',
            website: updatedVendorData.website || '',
            phone: updatedVendorData.contact_phone || '',
            facebook: updatedVendorData.social_media?.facebook || '',
            instagram: updatedVendorData.social_media?.instagram || '',
          }));
          
          // Update selectedTypes as well
          const types = (updatedVendorData.category || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          setSelectedTypes(types);
        }
      }
      
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  const handleWhatsAppContact = () => {
    if (!formData.phone) {
      Alert.alert('No Phone Number', 'WhatsApp number not available.');
      return;
    }

    const phoneNumber = formData.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp. Please try again.');
    });
  };

  const handleInstagramContact = () => {
    if (!formData.instagram) {
      Alert.alert('No Instagram', 'Instagram link not available.');
      return;
    }

    let instagramUrl = formData.instagram;
    
    // Handle different Instagram URL formats
    if (instagramUrl.includes('instagram.com/')) {
      // Already a full URL
    } else if (instagramUrl.startsWith('@')) {
      // Handle @username format
      instagramUrl = `https://instagram.com/${instagramUrl.substring(1)}`;
    } else {
      // Handle username without @
      instagramUrl = `https://instagram.com/${instagramUrl}`;
    }
    
    Linking.openURL(instagramUrl).catch(() => {
      Alert.alert('Error', 'Could not open Instagram. Please try again.');
    });
  };

  const handleWebsiteContact = () => {
    if (!formData.website) {
      Alert.alert('No Website', 'Website link not available.');
      return;
    }

    let websiteUrl = formData.website;
    
    // Add https:// if not present
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = `https://${websiteUrl}`;
    }
    
    Linking.openURL(websiteUrl).catch(() => {
      Alert.alert('Error', 'Could not open website. Please try again.');
    });
  };

  const handleFacebookContact = () => {
    if (!formData.facebook) {
      Alert.alert('No Facebook', 'Facebook link not available.');
      return;
    }

    let facebookUrl = formData.facebook;
    
    // Add https:// if not present
    if (!facebookUrl.startsWith('http://') && !facebookUrl.startsWith('https://')) {
      facebookUrl = `https://${facebookUrl}`;
    }
    
    Linking.openURL(facebookUrl).catch(() => {
      Alert.alert('Error', 'Could not open Facebook. Please try again.');
    });
  };

  const handleVideoPress = (videoUrl: string) => {
    Linking.openURL(videoUrl).catch(() => {
      Alert.alert('Error', 'Could not open video. Please try again.');
    });
  };

  const handleProfilePictureUpload = async () => {
    if (!user) return;

    try {
      setUploadingImage(true);
      
      // Show action sheet for image picker options
      Alert.alert(
        'Select Profile Picture',
        'Choose how you want to add a profile picture',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: () => handleImagePicker('camera') },
          { text: 'Choose from Gallery', onPress: () => handleImagePicker('gallery') },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open image picker');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImagePicker = async (source: 'camera' | 'gallery') => {
    if (!user) return;

    try {
      setUploadingImage(true);
      
      let imageUri: string | null = null;
      
      if (source === 'camera') {
        imageUri = await StorageService.takePhotoWithCamera();
      } else {
        imageUri = await StorageService.pickImageFromGallery();
      }

      if (!imageUri) {
        return; // User cancelled
      }

      // Upload to Supabase Storage
      const avatarUrl = await StorageService.uploadProfilePicture(user.id, imageUri);
      
      // Update user profile
      await updateProfile({ avatar_url: avatarUrl });
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!user || !user.avatar_url) return;

    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingImage(true);
              
              // Delete from Supabase Storage
              if (user.avatar_url) {
                await StorageService.deleteProfilePicture(user.avatar_url);
              }
              
              // Update user profile
              await updateProfile({ avatar_url: null });
              
              Alert.alert('Success', 'Profile picture removed successfully!');
            } catch (error: any) {
              console.error('Profile picture removal error:', error);
              Alert.alert('Error', error.message || 'Failed to remove profile picture');
            } finally {
              setUploadingImage(false);
            }
          }
        }
      ]
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Please sign in to view your account</Text>
      </View>
    );
  }

  if (vendorLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#be185d" />
          <Text style={styles.loadingText}>Loading account...</Text>
        </View>
      </View>
    );
  }

  const isViewer = user.role === 'viewer';
  const coverImage = vendor?.portfolio_images?.[0] ? ImageService.getPortfolioImageUrl(vendor.portfolio_images[0]) : null;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {isViewer ? (
          // Viewer Profile - Simple Layout
          <View style={styles.viewerCard}>
            {/* Profile Header */}
            <View style={styles.viewerHeader}>
              <View style={styles.viewerAvatarContainer}>
                <Image
                  source={{
                    uri: ImageService.getProfilePictureUrl(user.avatar_url)
                  }}
                  style={styles.viewerAvatar}
                />
                {isEditing && (
                  <TouchableOpacity 
                    style={styles.cameraButton}
                    onPress={handleProfilePictureUpload}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size={16} color="white" />
                    ) : (
                      <Camera size={16} color="white" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.viewerInfo}>
                <Text style={styles.viewerName}>{formData.fullName || 'Profile'}</Text>
                <Text style={styles.viewerEmail}>{formData.email}</Text>
              </View>
              {!isEditing && (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Form Fields */}
            <View style={styles.viewerForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                  editable={isEditing}
                  placeholder="Your full name"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.email}
                  editable={false}
                  placeholder="Email address"
                />
              </View>
            </View>

            {/* Action Buttons */}
            {isEditing && (
              <View style={styles.viewerActions}>
                <TouchableOpacity
                  onPress={() => setIsEditing(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={loading}
                  onPress={handleSave}
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // Vendor Profile - Complex Layout
          <View style={styles.vendorCard}>
            {/* Cover Photo */}
            <View style={styles.coverContainer}>
              {coverImage ? (
                <Image source={{ uri: coverImage }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder} />
              )}
              
              {/* Profile Avatar overlapping cover */}
              <View style={styles.avatarOverlay}>
                <Image
                  source={{
                    uri: ImageService.getProfilePictureUrl(user.avatar_url)
                  }}
                  style={styles.profileAvatar}
                />
                {isEditing && (
                  <TouchableOpacity 
                    style={styles.cameraButton}
                    onPress={handleProfilePictureUpload}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size={16} color="white" />
                    ) : (
                      <Camera size={16} color="white" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              
            </View>

            <View style={styles.vendorContent}>
              {/* Profile Picture Actions - Only in Edit Mode */}
              {isEditing && (
                <View style={styles.profilePictureActions}>
                  <TouchableOpacity
                    onPress={handleProfilePictureUpload}
                    style={styles.changeProfileButton}
                    disabled={uploadingImage}
                  >
                    <Text style={styles.changeProfileButtonText}>
                      {uploadingImage ? 'Uploading...' : 'Change Picture'}
                    </Text>
                  </TouchableOpacity>
                  {user.avatar_url && (
                    <TouchableOpacity
                      onPress={handleRemoveProfilePicture}
                      style={styles.removeProfileButton}
                      disabled={uploadingImage}
                    >
                      <Text style={styles.removeProfileButtonText}>
                        {uploadingImage ? 'Removing...' : 'Remove Picture'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Business Name */}
              <Text style={styles.businessName}>
                {vendor?.business_name || formData.businessName}
              </Text>

              {!isEditing ? (
                // View Mode
                <View style={styles.viewMode}>
                  {/* Business Categories */}
                  <View style={styles.categoriesContainer}>
                    {selectedTypes.length > 0 ? (
                      selectedTypes.map(type => (
                        <View key={type} style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{type}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noCategoriesText}>No business types set</Text>
                    )}
                  </View>

                  {/* Owner Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Owner Name</Text>
                      <Text style={styles.detailValue}>{formData.fullName || '—'}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.detailCard, formData.phone && styles.detailCardClickable]}
                      onPress={formData.phone ? handleWhatsAppContact : undefined}
                      disabled={!formData.phone}
                    >
                      <Text style={styles.detailLabel}>WhatsApp Number</Text>
                      <Text style={[styles.detailValue, formData.phone && styles.detailValueClickable]}>
                        {formData.phone || '—'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.detailCard}>
                      <Text style={styles.detailLabel}>Owner Email</Text>
                      <Text style={styles.detailValue}>{formData.email}</Text>
                    </View>
                  </View>

                  {/* Links Grid */}
                  <View style={styles.linksGrid}>
                    <TouchableOpacity 
                      style={[styles.linkCard, formData.website && styles.linkCardClickable]}
                      onPress={formData.website ? handleWebsiteContact : undefined}
                      disabled={!formData.website}
                    >
                      <Text style={styles.linkLabel}>Website</Text>
                      <Text style={[styles.linkValue, formData.website && styles.linkValueClickable]}>
                        {formData.website || '—'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.linkCard, formData.facebook && styles.linkCardClickable]}
                      onPress={formData.facebook ? handleFacebookContact : undefined}
                      disabled={!formData.facebook}
                    >
                      <Text style={styles.linkLabel}>Facebook</Text>
                      <Text style={[styles.linkValue, formData.facebook && styles.linkValueClickable]}>
                        {formData.facebook || '—'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.linkCard, formData.instagram && styles.linkCardClickable]}
                      onPress={formData.instagram ? handleInstagramContact : undefined}
                      disabled={!formData.instagram}
                    >
                      <Text style={styles.linkLabel}>Instagram</Text>
                      <Text style={[styles.linkValue, formData.instagram && styles.linkValueClickable]}>
                        {formData.instagram || '—'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.editProfileButton}
                  >
                    <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Edit Mode
                <View style={styles.editMode}>
                  {/* Personal Information Section */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionDot} />
                      <Text style={styles.sectionTitle}>Personal Information</Text>
                    </View>
                    <View style={styles.sectionContent}>
                      <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Full Name</Text>
                          <TextInput
                            style={styles.sectionInput}
                            value={formData.fullName}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                            placeholder="Enter your full name"
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Business Name</Text>
                          <TextInput
                            style={styles.sectionInput}
                            value={formData.businessName}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, businessName: text }))}
                            placeholder="Enter your business name"
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Contact Information Section */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: '#3b82f6' }]} />
                      <Text style={styles.sectionTitle}>Contact Information</Text>
                    </View>
                    <View style={styles.sectionContent}>
                      <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>WhatsApp Number</Text>
                          <TextInput
                            style={styles.sectionInput}
                            value={formData.phone}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                            placeholder="+91 7972646904"
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Email Address</Text>
                          <TextInput
                            style={[styles.sectionInput, styles.inputDisabled]}
                            value={formData.email}
                            editable={false}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Social Media Section */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: '#8b5cf6' }]} />
                      <Text style={styles.sectionTitle}>Social Media & Links</Text>
                    </View>
                    <View style={styles.sectionContent}>
                      <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Website URL</Text>
                          <TextInput
                            style={styles.sectionInput}
                            value={formData.website}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
                            placeholder="https://yourwebsite.com"
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Facebook URL</Text>
                          <TextInput
                            style={styles.sectionInput}
                            value={formData.facebook}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, facebook: text }))}
                            placeholder="https://facebook.com/yourpage"
                          />
                        </View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Instagram URL</Text>
                        <TextInput
                          style={styles.sectionInput}
                          value={formData.instagram}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, instagram: text }))}
                          placeholder="https://instagram.com/yourhandle"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Business Categories Section */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.sectionTitle}>Business Categories</Text>
                    </View>
                    <View style={styles.categoriesGrid}>
                      {CATEGORIES.filter(c => c !== 'All').map(type => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => toggleType(type)}
                          style={[
                            styles.categoryOption,
                            selectedTypes.includes(type) && styles.categoryOptionSelected
                          ]}
                        >
                          <Text style={[
                            styles.categoryOptionText,
                            selectedTypes.includes(type) && styles.categoryOptionTextSelected
                          ]}>
                            {type}
                          </Text>
                          {selectedTypes.includes(type) && (
                            <View style={styles.categorySelectedDot} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      disabled={loading}
                      onPress={() => setIsEditing(false)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={loading}
                      onPress={handleSave}
                      style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    >
                      <Text style={styles.saveButtonText}>
                        {loading ? 'Saving...' : 'Save Profile'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Portfolio Management Section */}
        {!isViewer && vendor && (
          <View style={styles.portfolioCard}>
            <View style={styles.portfolioHeader}>
              <Text style={styles.portfolioTitle}>Portfolio Management</Text>
              <Text style={styles.portfolioSubtitle}>Manage your cover picture, portfolio images, and videos</Text>
            </View>
            <PortfolioManager
              vendorId={vendor.id}
              currentImages={vendor.portfolio_images || []}
              currentVideos={vendor.portfolio_videos || []}
              onImagesUpdate={(images) => {
                setVendor((prev: any) => prev ? { ...prev, portfolio_images: images } : null);
              }}
              onVideosUpdate={(videos) => {
                setVendor((prev: any) => prev ? { ...prev, portfolio_videos: videos } : null);
              }}
              disabled={!isEditing}
            />
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={20} color="#dc2626" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8, // Small padding below header
    paddingBottom: 120, // Increased padding to ensure sign out button is visible
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 50,
  },
  
  // Viewer Styles
  viewerCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewerAvatarContainer: {
    marginRight: 16,
  },
  viewerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  viewerInfo: {
    flex: 1,
  },
  viewerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  viewerEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  viewerForm: {
    marginBottom: 24,
  },
  viewerActions: {
    flexDirection: 'row',
    gap: 12,
  },

  // Vendor Styles
  vendorCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  coverContainer: {
    height: 144,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#be185d',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: -40,
    left: '50%',
    marginLeft: -40,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
  },
  profilePictureActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16, // Space before business name
    gap: 12,
  },
  changeProfileButton: {
    backgroundColor: '#be185d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  changeProfileButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  removeProfileButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  removeProfileButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  vendorContent: {
    padding: 24,
    paddingTop: 60,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },

  // View Mode Styles
  viewMode: {
    gap: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#fce7f3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fbcfe8',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#be185d',
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  detailCardClickable: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  detailValueClickable: {
    color: '#0ea5e9',
    textDecorationLine: 'underline',
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  linkCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  linkLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  linkValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  linkCardClickable: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  linkValueClickable: {
    color: '#0ea5e9',
    textDecorationLine: 'underline',
  },
  editProfileButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  editProfileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  // Edit Mode Styles
  editMode: {
    gap: 24,
  },
  section: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#be185d',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sectionContent: {
    gap: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: 'white',
    color: '#111827',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    minWidth: '30%',
    position: 'relative',
  },
  categoryOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryOptionTextSelected: {
    color: '#059669',
  },
  categorySelectedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },

  // Common Input Styles
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },

  // Button Styles
  editButton: {
    backgroundColor: '#fce7f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#be185d',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  removeButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#be185d',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 40, // Increased margin to ensure it's well above bottom nav
    borderWidth: 1,
    borderColor: '#dc2626',
    gap: 8,
  },
  signOutButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 16,
  },

  // Portfolio Management Styles
  portfolioCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 24,
  },
  portfolioHeader: {
    marginBottom: 16,
  },
  portfolioTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  portfolioSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#be185d',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
});