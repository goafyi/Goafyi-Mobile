import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MapPin, Phone, Mail, MessageCircle, Calendar, Heart, Share2, X, Globe, DollarSign, Instagram, Play, MessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { VendorService, type VendorWithUser } from '../services/vendorService';
import { RatingService, type VendorRating, type RatingWithUser, type RatingStats } from '../services/ratingService';
import { AvailabilityService, type AvailabilitySettingsRecord, type BlockedDateRecord } from '../services/availabilityService';
import { PackageService, type PackageRecord } from '../services/packageService';
import { BookingService } from '../services/bookingService';
import { RequestService } from '../services/requestService';
import { ImageService } from '../services/imageService';
import { useSupabase } from '../context/SupabaseContext';

interface VendorProfileScreenProps {
  vendorId: string;
  navigation?: any;
}

// Function to get category-specific colors and gradients
const getCategoryColors = (category: string) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    'Wedding Planner': { bg: '#8b5cf6', text: 'white' },
    'Emcee': { bg: '#3b82f6', text: 'white' },
    'Decorator': { bg: '#10b981', text: 'white' },
    'Photographer': { bg: '#f97316', text: 'white' },
    'Cameraman': { bg: '#6366f1', text: 'white' },
    'Catering': { bg: '#eab308', text: 'white' },
    'Venue': { bg: '#14b8a6', text: 'white' },
    'Band': { bg: '#ec4899', text: 'white' },
    'Solo Artist': { bg: '#8b5cf6', text: 'white' },
    'DJ': { bg: '#374151', text: 'white' },
    'Florist': { bg: '#22c55e', text: 'white' },
    'Makeup Artist': { bg: '#f43f5e', text: 'white' },
    'Suit Designer': { bg: '#475569', text: 'white' },
    'Gown Designer': { bg: '#d946ef', text: 'white' },
    'Bridesmaid Dresses': { bg: '#f472b6', text: 'white' },
    'Best Man Suits': { bg: '#2563eb', text: 'white' },
    'Accessories': { bg: '#f59e0b', text: 'white' },
    'Bar Services': { bg: '#ef4444', text: 'white' }
  };
  
  return colorMap[category] || { bg: '#6b7280', text: 'white' };
};

export default function VendorProfileScreen({ vendorId, navigation }: VendorProfileScreenProps) {
  const { user } = useSupabase();
  const insets = useSafeAreaInsets();
  const [vendor, setVendor] = useState<VendorWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

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
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState<VendorRating | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [reviews, setReviews] = useState<RatingWithUser[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageRecord | null>(null);
  const [requestForm, setRequestForm] = useState({
    numberOfPeople: '',
    additionalInfo: '',
    requestChanges: '',
    contactPhone: '',
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [availabilitySettings, setAvailabilitySettings] = useState<AvailabilitySettingsRecord | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, any[]>>({});
  const [packages, setPackages] = useState<(PackageRecord & { package_extras: any[] })[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    const loadVendor = async () => {
      if (!vendorId) {
        setError('Vendor ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const vendorData = await VendorService.getVendorByIdCachedFirst(vendorId);
        console.log('Vendor data loaded:', vendorData);
        setVendor(vendorData);
        
        if (vendorData) {
          // Load additional data in parallel
          Promise.all([
            user?.id ? RatingService.getUserRating(vendorId, user.id) : Promise.resolve(null),
            RatingService.getVendorRatingStats(vendorId),
            RatingService.getVendorRatings(vendorId, 1, 10)
          ]).then(([existingRating, stats, reviewsData]) => {
            setUserRating(existingRating);
            setRatingStats(stats);
            setReviews(reviewsData.ratings);
          }).catch(console.error);
        }
      } catch (err) {
        console.error('Error loading vendor:', err);
        setError('Failed to load vendor profile');
      } finally {
        setLoading(false);
      }
    };

    loadVendor();
  }, [vendorId, user?.id]);

  // Populate contact phone from user data
  useEffect(() => {
    if (user) {
      setRequestForm(prev => ({
        ...prev,
        contactPhone: user.phone || '',
      }));
    }
  }, [user?.id]);

  // Load packages and availability when booking modal opens
  const loadPackagesAndAvailability = async () => {
    if (!vendorId) return;
    
    try {
      setAvailabilityLoading(true);
      
      // Load packages
      const packagesData = await PackageService.getVendorPackages(vendorId);
      setPackages(packagesData);
      
      // Load availability settings
      const settings = await AvailabilityService.getSettings(vendorId);
      setAvailabilitySettings(settings);
      
      // Load blocked dates
      const blocked = await AvailabilityService.listBlockedDates(vendorId);
      setBlockedDates(blocked.map(b => b.date));
      
      // Load bookings
      const allBookings = await BookingService.getVendorBookings(vendorId);
      
      // Bucket by date for the current month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startIso = new Date(year, month, 1).toISOString().slice(0, 10);
      const endIso = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      
      const bucket: Record<string, any[]> = {};
      for (const booking of allBookings) {
        const dateIso = (booking as any).event_date as string;
        if (!dateIso) continue;
        if (dateIso >= startIso && dateIso <= endIso) {
          if (!bucket[dateIso]) bucket[dateIso] = [];
          bucket[dateIso].push(booking);
        }
      }
      setBookingsByDate(bucket);
      
      console.log('VendorProfileScreen: Loaded packages:', packagesData.length);
      console.log('VendorProfileScreen: Loaded blocked dates:', blocked.length);
      console.log('VendorProfileScreen: Loaded bookings:', Object.keys(bucket).length);
    } catch (error) {
      console.error('Error loading packages and availability:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleRequestQuote = (pkg: PackageRecord) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to request a quote.');
      return;
    }
    
    if (selectedDates.length === 0) {
      Alert.alert('No Dates Selected', 'Please select at least one date from the calendar before requesting a quote.');
      return;
    }
    
    setSelectedPackage(pkg);
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!user || !selectedPackage || !vendor) {
      return;
    }

    if (selectedDates.length === 0) {
      Alert.alert('No Dates Selected', 'Please select at least one date from the calendar.');
      return;
    }

    if (!requestForm.contactPhone.trim()) {
      Alert.alert('Phone Required', 'Please provide your phone number.');
      return;
    }

    setIsSubmittingRequest(true);

    try {
      await RequestService.createRequest({
        vendor_id: vendor.id,
        user_id: user.id,
        package_id: selectedPackage.id,
        dates: selectedDates,
        notes: requestForm.additionalInfo.trim() || undefined,
        requested_changes: requestForm.requestChanges.trim() || undefined,
        phone: requestForm.contactPhone.trim(),
      });

      Alert.alert(
        'Request Submitted!', 
        'Your booking request has been submitted successfully! The vendor will contact you within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRequestModal(false);
              setShowBookingModal(false);
              // Reset form
              setRequestForm({
                numberOfPeople: '',
                additionalInfo: '',
                requestChanges: '',
                contactPhone: user.phone || '',
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting booking request:', error);
      Alert.alert('Error', 'Failed to submit booking request. Please try again.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleRatingSubmit = async () => {

    if (currentRating === 0) {
      setRatingError('Please select a rating');
      return;
    }

    setRatingSubmitting(true);
    setRatingError(null);

    try {
      const ratingData = {
        rating: currentRating,
        review_text: reviewText.trim() || undefined
      };

      const result = await RatingService.submitRating(vendorId, user.id, ratingData);
      if (result) {
        setUserRating(result);
        Alert.alert('Success', 'Rating submitted successfully!');
        setShowRatingModal(false);
        
        // Refresh rating data
        const [stats, reviewsData] = await Promise.all([
          RatingService.getVendorRatingStats(vendorId),
          RatingService.getVendorRatings(vendorId, 1, 10)
        ]);
        setRatingStats(stats);
        setReviews(reviewsData.ratings);
        
        // Reset form
        setCurrentRating(0);
        setReviewText('');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      setRatingError('Failed to submit rating. Please try again.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleStarRating = (rating: number) => {
    setCurrentRating(rating);
    setRatingError(null);
  };

  const handleContact = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to contact this vendor.');
      return;
    }
    setShowContactModal(true);
  };

  const handleBooking = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to book this vendor.');
      return;
    }
    setShowBookingModal(true);
    loadAvailabilityData();
  };

  const handleWhatsAppContact = () => {
    if (!vendor?.contact_phone) {
      Alert.alert('No Mobile Number', 'This vendor has not provided a mobile number.');
      return;
    }

    const message = `Hello ${vendor.business_name}, I found your profile on Goafyi and I would like to...`;
    
    const phoneNumber = vendor.contact_phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp. Please try again.');
    });
  };

  const handleInstagramContact = () => {
    if (!vendor.social_media?.instagram) {
      Alert.alert('No Instagram', 'This vendor has not provided an Instagram handle.');
      return;
    }

    const message = `Hello ${vendor.business_name}, I found your profile on Goafyi and I would like to...`;
    
    Alert.alert(
      'Instagram Message',
      message,
      [
        {
          text: 'Copy Message',
          onPress: () => {
            // Copy to clipboard functionality would go here
            Alert.alert('Copied', 'Message copied to clipboard!');
          }
        },
        {
          text: 'Open Instagram',
          onPress: () => {
            const instagramUrl = `https://instagram.com/${vendor.social_media.instagram}`;
            Linking.openURL(instagramUrl).catch(() => {
              Alert.alert('Error', 'Could not open Instagram. Please try again.');
            });
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleToggleDate = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const loadAvailabilityData = async () => {
    if (!vendor?.id) return;
    
    try {
      setAvailabilityLoading(true);
      console.log('Loading availability data for vendor:', vendor.id);
      
      // Load packages from Supabase
      const packagesData = await PackageService.getVendorPackages(vendor.id);
      console.log('Loaded packages:', packagesData);
      const mappedPackages = (packagesData || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        pricing_type: p.pricing_type,
        price: p.price ?? undefined,
        price_per_person: p.price_per_person ?? undefined,
        min_persons: p.min_persons ?? undefined,
        duration_label: p.duration_label ?? '',
        deliverables: p.deliverables ?? [],
        terms: p.terms ?? '',
        extras: (p.package_extras || []).map((ex: any) => ({
          name: ex.name,
          available_qty: ex.available_qty ?? undefined,
          price_per_unit: ex.price_per_unit ?? undefined
        }))
      }));
      setPackages(mappedPackages);

      // Load availability settings
      const settings = await AvailabilityService.getSettings(vendor.id);
      console.log('Loaded availability settings:', settings);
      setAvailabilitySettings(settings);

      // Load blocked dates (dates vendor marked as not available)
      const blocked = await AvailabilityService.listBlockedDates(vendor.id);
      console.log('Loaded blocked dates:', blocked);
      setBlockedDates((blocked || []).map((b: any) => b.date));

      // Load bookings (confirmed bookings from customers)
      const bookings = await BookingService.getVendorBookings(vendor.id);
      console.log('Loaded bookings:', bookings);
      const bucket: Record<string, any[]> = {};
      for (const b of (bookings || [])) {
        const date = b.event_date;
        if (!bucket[date]) bucket[date] = [];
        bucket[date].push(b);
      }
      setBookingsByDate(bucket);
      
    } catch (error) {
      console.error('Error loading availability data:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const format = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const isDayOff = (date: Date) => availabilitySettings?.days_off?.[dayNames[date.getDay()]] === true;
    
    const cells: { iso: string | null; status?: 'available' | 'blocked' | 'dayoff' | 'booked'; hasBookings?: boolean }[] = Array(firstDay).fill({ iso: null });
    let availableCount = 0, blockedCount = 0, bookedCount = 0, dayoffCount = 0;
    
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = format(year, month, d);
      const date = new Date(year, month, d);
      const blocked = blockedDates.includes(iso);
      const dayoff = isDayOff(date);
      const hasBookings = (bookingsByDate[iso] || []).length > 0;
      
      let status: 'available' | 'blocked' | 'dayoff' | 'booked' = 'available';
      if (hasBookings) { 
        status = 'booked'; 
        bookedCount++; 
      } else if (blocked) { 
        status = 'blocked'; 
        blockedCount++; 
      } else if (dayoff) { 
        status = 'dayoff'; 
        dayoffCount++; 
      } else { 
        availableCount++; 
      }
      cells.push({ iso, status, hasBookings });
    }
    
    return (
      <View style={styles.calendarContainer}>
        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(year, month - 1, 1))}
            style={styles.calendarNavButton}
          >
            <Text style={styles.calendarNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.calendarMonthText}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(year, month + 1, 1))}
            style={styles.calendarNavButton}
          >
            <Text style={styles.calendarNavText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {dayNames.map((day) => (
            <Text key={day} style={styles.dayHeaderText}>{day}</Text>
          ))}
        </View>
        
        {/* Calendar Days */}
        <View style={styles.calendarGrid}>
          {cells.map((cell, idx) => {
            const isSelected = cell.iso ? selectedDates.includes(cell.iso) : false;
            const isClickable = !!cell.iso && (cell.status === 'available' || cell.status === 'booked');
            
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => isClickable && handleToggleDate(cell.iso!)}
                style={[
                  styles.calendarDay,
                  !cell.iso && styles.calendarDayEmpty,
                  isSelected && styles.calendarDaySelected,
                  cell.status === 'booked' && styles.calendarDayBooked,
                  cell.status === 'blocked' && styles.calendarDayBlocked,
                  cell.status === 'dayoff' && styles.calendarDayOff,
                  cell.status === 'available' && styles.calendarDayAvailable,
                ]}
                disabled={!isClickable}
              >
                <Text style={[
                  styles.calendarDayText,
                  isSelected && styles.calendarDayTextSelected,
                  cell.status === 'blocked' && styles.calendarDayTextBlocked,
                  cell.status === 'dayoff' && styles.calendarDayTextOff,
                ]}>
                  {cell.iso ? cell.iso.split('-')[2] : ''}
                </Text>
                {cell.hasBookings && (
                  <View style={styles.bookingIndicator} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#be185d" />
          <Text style={styles.loadingText}>Loading vendor profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !vendor) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Vendor not found'}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeMap = {
      sm: 12,
      md: 16,
      lg: 20
    };

    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={sizeMap[size]}
            color={star <= rating ? '#fbbf24' : '#e5e7eb'}
            fill={star <= rating ? '#fbbf24' : 'transparent'}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#be185d" />
          <Text style={styles.loadingText}>Loading vendor profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !vendor) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <MapPin size={48} color="#9ca3af" />
          </View>
          <Text style={styles.errorTitle}>Vendor not found</Text>
          <Text style={styles.errorSubtitle}>{error || 'This vendor profile could not be found.'}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const coverImage = vendor.portfolio_images && vendor.portfolio_images[0] 
    ? ImageService.getPortfolioImageUrl(vendor.portfolio_images[0])
    : 'https://via.placeholder.com/400x300?text=No+Image';
  
  const profileImage = ImageService.getProfilePictureUrl(vendor.user?.avatar_url);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={[styles.scrollView, { paddingBottom: 300 }]} showsVerticalScrollIndicator={false}>
        {/* Cover Photo with back button */}
        <View style={styles.coverContainer}>
          <Image 
            source={{ uri: coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.coverOverlay} />
          
          {/* Back button positioned on cover image */}
          <TouchableOpacity
            style={styles.coverBackButton}
            onPress={() => navigation?.goBack()}
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            {/* Profile Picture */}
            <View style={styles.profilePictureContainer}>
              <View style={styles.profilePicture}>
                {vendor.user?.avatar_url ? (
                  <Image
                    source={{ uri: ImageService.getProfilePictureUrl(vendor.user.avatar_url) }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImageText}>
                      {(vendor.business_name || vendor.user?.full_name || 'V').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.businessName}>
                {vendor.business_name}
              </Text>
              <Text style={styles.fullName}>
                {vendor.user?.full_name || ''}
              </Text>
              
              {/* Rating Display */}
              <View style={styles.ratingContainer}>
                {ratingStats && ratingStats.total_ratings > 0 ? (
                  <>
                    {renderStars(Math.round(ratingStats.average_rating), 'sm')}
                    <Text style={styles.ratingText}>
                      {ratingStats.average_rating.toFixed(1)}
                    </Text>
                    <Text style={styles.ratingCount}>
                      ({ratingStats.total_ratings} {ratingStats.total_ratings === 1 ? 'rating' : 'ratings'})
                    </Text>
                  </>
                ) : (
                  <>
                    {renderStars(0, 'sm')}
                    <Text style={styles.ratingText}>0.0</Text>
                    <Text style={styles.ratingCount}>(0 ratings)</Text>
                  </>
                )}
              </View>
            </View>

            {/* Business Categories */}
            {vendor.category && (
              <View style={styles.categoriesContainer}>
                {vendor.category.split(',').map((cat, index) => {
                  const trimmedCat = cat.trim();
                  const categoryColors = getCategoryColors(trimmedCat);
                  return (
                    <View
                      key={index}
                      style={[styles.categoryBadge, { backgroundColor: categoryColors.bg }]}
                    >
                      <Text style={[styles.categoryBadgeText, { color: categoryColors.text }]}>
                        {trimmedCat}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Location and Website */}
            <View style={styles.locationWebsiteContainer}>
              {vendor.location && (
                <View style={styles.locationBadge}>
                  <MapPin size={16} color="white" />
                  <Text style={styles.locationBadgeText}>{vendor.location}</Text>
                </View>
              )}
              {vendor.website && (
                <TouchableOpacity 
                  style={styles.websiteBadge}
                  onPress={() => {
                    const url = vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`;
                    Linking.openURL(url);
                  }}
                >
                  <Globe size={16} color="white" />
                  <Text style={styles.websiteBadgeText}>Website</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Contact Information */}
            <View style={styles.contactInfo}>
              {vendor.user?.email && (
                <View style={styles.contactItem}>
                  <Mail size={20} color="#9ca3af" />
                  <Text style={styles.contactText}>{vendor.user.email}</Text>
                </View>
              )}
              
              
            </View>

            {/* WhatsApp & Instagram Buttons */}
            <View style={styles.placeholderButtonsContainer}>
              {vendor.contact_phone && (
                <TouchableOpacity
                  style={styles.whatsappPlaceholderButton}
                  onPress={handleWhatsAppContact}
                >
                  <MessageSquare size={16} color="white" />
                  <Text style={styles.placeholderButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
              
              {vendor.social_media?.instagram && (
                <TouchableOpacity
                  style={styles.instagramPlaceholderButton}
                  onPress={handleInstagramContact}
                >
                  <Instagram size={16} color="white" />
                  <Text style={styles.placeholderButtonText}>Instagram</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Availability & Pricing Button */}
            <View style={styles.availabilityButtonContainer}>
              <TouchableOpacity
                style={styles.availabilityButton}
                onPress={() => {
                  loadPackagesAndAvailability();
                  setShowBookingModal(true);
                }}
              >
                <Calendar size={14} color="white" />
                <DollarSign size={14} color="white" />
                <Text style={styles.availabilityButtonText}>Availability & Pricing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Gallery - Photos & Videos */}
        {((vendor.portfolio_images && vendor.portfolio_images.length > 0) || (vendor.portfolio_videos && vendor.portfolio_videos.length > 0)) && (
          <View style={styles.gallerySection}>
            <View style={styles.galleryCard}>
              <Text style={styles.galleryTitle}>Gallery - Photos & Videos</Text>
              
              {/* Photos Section */}
              {vendor.portfolio_images && vendor.portfolio_images.length > 0 && (
                <View style={styles.photosSection}>
                  <View style={styles.photosHeader}>
                    <View style={styles.photosIconContainer}>
                      <View style={styles.photosIcon}>
                        <Text style={styles.photosIconText}>📷</Text>
                      </View>
                    </View>
                    <Text style={styles.photosTitle}>Photos ({vendor.portfolio_images.length})</Text>
                  </View>
                  <View style={styles.photosGrid}>
                    {vendor.portfolio_images.map((src, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.photoItem}
                        onPress={() => {
                          setViewerIndex(idx);
                          setShowImageViewer(true);
                        }}
                      >
                        <Image 
                          source={{ uri: ImageService.getPortfolioImageUrl(src) }}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Videos Section */}
              {vendor.portfolio_videos && vendor.portfolio_videos.length > 0 && (
                <View style={styles.videosSection}>
                  <View style={styles.videosHeader}>
                    <View style={styles.videosIconContainer}>
                      <Text style={styles.videosIcon}>🎥</Text>
                    </View>
                    <Text style={styles.videosTitle}>Videos ({vendor.portfolio_videos.length})</Text>
                  </View>
                  <View style={styles.videosList}>
                    {vendor.portfolio_videos.map((videoUrl, idx) => {
                      const videoId = extractYouTubeVideoId(videoUrl);
                      
                      return (
                        <View key={idx} style={styles.videoContainer}>
                          <Text style={styles.videoTitle}>
                            {videoId ? `YouTube Video ${idx + 1}` : `Video ${idx + 1}`}
                          </Text>
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
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={styles.videoItem}
                              onPress={() => Linking.openURL(videoUrl)}
                            >
                              <View style={styles.videoContent}>
                                <Play size={32} color="#be185d" />
                                <Text style={styles.videoText}>
                                  Tap to open video
                                </Text>
                              </View>
                              <Text style={styles.videoUrlText}>
                                {videoUrl.length > 60 ? `${videoUrl.substring(0, 60)}...` : videoUrl}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}


              {/* Reviews Section */}
              <View style={styles.reviewsSection}>
                <View style={styles.reviewsCard}>
                  <View style={styles.reviewsHeader}>
                    <View style={styles.reviewsTitleContainer}>
                      <Text style={styles.reviewsTitle}>Reviews & Ratings</Text>
                      {ratingStats && ratingStats.total_ratings > 0 && (
                        <View style={styles.reviewsBadge}>
                          <Text style={styles.reviewsBadgeText}>{ratingStats.total_ratings}</Text>
                        </View>
                      )}
                    </View>
                    {user && (
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => setShowRatingModal(true)}
                      >
                        <Star size={16} color="white" />
                        <Text style={styles.rateButtonText}>
                          {userRating ? 'Update' : 'Rate'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {ratingStats && ratingStats.total_ratings > 0 ? (
                    <>
                      {/* Rating Summary */}
                      <View style={styles.ratingSummary}>
                        <View style={styles.ratingMainStats}>
                          <View style={styles.ratingNumberContainer}>
                            <Text style={styles.ratingAverage}>{ratingStats.average_rating.toFixed(1)}</Text>
                            <View style={styles.ratingStars}>
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  color={i < Math.round(ratingStats.average_rating) ? '#fbbf24' : '#d1d5db'}
                                  fill={i < Math.round(ratingStats.average_rating) ? '#fbbf24' : 'transparent'}
                                />
                              ))}
                            </View>
                            <Text style={styles.ratingCount}>
                              {ratingStats.total_ratings} {ratingStats.total_ratings === 1 ? 'review' : 'reviews'}
                            </Text>
                          </View>
                        </View>

                        {/* Rating Distribution */}
                        <View style={styles.ratingDistribution}>
                          {ratingStats.rating_distribution.map(({ rating, count }) => {
                            console.log('Rating distribution item:', { rating, count });
                            return (
                              <View key={rating} style={styles.ratingBar}>
                                <Text style={styles.ratingLabel}>{rating}</Text>
                                <Star size={18} color="#fbbf24" fill="#fbbf24" />
                                <View style={styles.ratingBarContainer}>
                                  <View
                                    style={[
                                      styles.ratingBarFill,
                                      { width: `${(count / ratingStats.total_ratings) * 100}%` }
                                    ]}
                                  />
                                </View>
                                <Text style={styles.ratingBarCount}>{count}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* Reviews List */}
                      {reviews.length > 0 && (
                        <View style={styles.reviewsList}>
                          <View style={styles.reviewsListHeader}>
                            <Text style={styles.reviewsListTitle}>Reviews</Text>
                            {reviews.length > 3 && (
                              <TouchableOpacity
                                style={styles.showAllButton}
                                onPress={() => setShowAllReviews(!showAllReviews)}
                              >
                                <Text style={styles.showAllButtonText}>
                                  {showAllReviews ? 'Show Less' : 'Show All'}
                                </Text>
                                {showAllReviews ? (
                                  <ChevronUp size={16} color="#be185d" />
                                ) : (
                                  <ChevronDown size={16} color="#be185d" />
                                )}
                              </TouchableOpacity>
                            )}
                          </View>

                          <View style={styles.reviewsContainer}>
                            {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
                              <View key={review.id} style={styles.reviewItem}>
                                <View style={styles.reviewHeader}>
                                  <View style={styles.reviewerAvatar}>
                                    <Text style={styles.reviewerAvatarText}>
                                      {review.reviewer.full_name?.charAt(0) || 'U'}
                                    </Text>
                                  </View>
                                  <View style={styles.reviewInfo}>
                                    <Text style={styles.reviewerName}>
                                      {review.reviewer.full_name || 'Anonymous'}
                                    </Text>
                                    <View style={styles.reviewRating}>
                                      {Array.from({ length: 5 }, (_, i) => (
                                        <Star
                                          key={i}
                                          size={10}
                                          color={i < review.rating ? '#fbbf24' : '#d1d5db'}
                                          fill={i < review.rating ? '#fbbf24' : 'transparent'}
                                        />
                                      ))}
                                    </View>
                                    <Text style={styles.reviewDate}>
                                      {new Date(review.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </Text>
                                  </View>
                                </View>
                                {review.review_text && (
                                  <Text style={styles.reviewText}>{review.review_text}</Text>
                                )}
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.noReviewsContainer}>
                      <Star size={32} color="#d1d5db" />
                      <Text style={styles.noReviewsText}>No reviews yet</Text>
                      {user && (
                        <TouchableOpacity
                          style={styles.firstReviewButton}
                          onPress={() => setShowRatingModal(true)}
                        >
                          <Text style={styles.firstReviewButtonText}>Be the first to review</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>


            </View>
          </View>
        )}
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity 
            style={styles.imageViewerBackdrop}
            onPress={() => setShowImageViewer(false)}
          />
          <View style={styles.imageViewerContent}>
            <TouchableOpacity
              style={styles.imageViewerCloseButton}
              onPress={() => setShowImageViewer(false)}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
            <Image 
              source={{ uri: ImageService.getPortfolioImageUrl(vendor.portfolio_images[viewerIndex]) }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </Modal>


      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bookingModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Availability & Pricing</Text>
              <TouchableOpacity
                onPress={() => setShowBookingModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.bookingModalBody} showsVerticalScrollIndicator={false}>
              {/* Availability Calendar Section */}
              <View style={styles.availabilityCalendarSection}>
                <View style={styles.availabilityCalendarHeader}>
                  <Calendar size={16} color="#6b7280" />
                  <Text style={styles.availabilityCalendarTitle}>Availability</Text>
                </View>
                
                {renderCalendar()}
                
                {selectedDates.length > 0 && (
                  <View style={styles.selectedDatesContainer}>
                    <View style={styles.selectedDatesHeader}>
                      <Calendar size={12} color="#2563eb" />
                      <Text style={styles.selectedDatesTitle}>Selected Dates</Text>
                    </View>
                    <View style={styles.selectedDatesList}>
                      {selectedDates.map(date => (
                        <View key={date} style={styles.selectedDateBadge}>
                          <Text style={styles.selectedDateText}>{date}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Packages Section */}
              <View style={styles.packagesSection}>
                <Text style={styles.sectionTitle}>Available Packages</Text>
                {availabilityLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#be185d" />
                    <Text style={styles.loadingText}>Loading packages...</Text>
                  </View>
                ) : packages.length > 0 ? (
                  <View style={styles.packagesList}>
                    {packages.map((pkg) => (
                      <View key={pkg.id} style={styles.packageItem}>
                        <View style={styles.packageHeader}>
                          <Text style={styles.packageName}>{pkg.title}</Text>
                          <Text style={styles.packagePrice}>
                            {pkg.pricing_type === 'per_person' 
                              ? `₹${pkg.price_per_person}/person`
                              : `₹${pkg.price?.toLocaleString()}`
                            }
                          </Text>
                        </View>
                        {pkg.duration_label && (
                          <Text style={styles.packageDuration}>{pkg.duration_label}</Text>
                        )}
                        {pkg.deliverables && pkg.deliverables.length > 0 && (
                          <View style={styles.packageDeliverables}>
                            {pkg.deliverables.slice(0, 3).map((deliverable, idx) => (
                              <Text key={idx} style={styles.packageDeliverableItem}>
                                • {deliverable}
                              </Text>
                            ))}
                            {pkg.deliverables.length > 3 && (
                              <Text style={styles.packageDeliverableItem}>
                                • +{pkg.deliverables.length - 3} more...
                              </Text>
                            )}
                          </View>
                        )}
                        <TouchableOpacity 
                          style={styles.requestPackageButton}
                          onPress={() => handleRequestQuote(pkg)}
                        >
                          <Text style={styles.requestPackageButtonText}>Request Quote</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noPackagesContainer}>
                    <Text style={styles.noPackagesText}>No packages available</Text>
                    <Text style={styles.noPackagesSubtext}>
                      Contact the vendor directly for custom pricing
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModalContent}>
            <View style={styles.ratingModalHeader}>
              <View style={styles.ratingModalTitleContainer}>
                <Text style={styles.ratingModalTitle}>
                  {userRating ? 'Update Rating' : 'Rate & Review'}
                </Text>
                <Text style={styles.ratingModalSubtitle}>{vendor?.business_name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRatingModal(false)}
                style={styles.ratingModalCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ratingModalBody} showsVerticalScrollIndicator={false}>
              {/* Star Rating */}
              <View style={styles.starRatingSection}>
                <Text style={styles.starRatingLabel}>How was your experience?</Text>
                <View style={styles.starRatingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleStarRating(star)}
                      style={styles.starButton}
                    >
                      <Star
                        size={40}
                        color={star <= currentRating ? '#fbbf24' : '#d1d5db'}
                        fill={star <= currentRating ? '#fbbf24' : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Rating Label */}
                {currentRating > 0 && (
                  <View style={styles.ratingLabelContainer}>
                    <Text style={styles.ratingLabel}>
                      {currentRating === 1 && 'Poor'}
                      {currentRating === 2 && 'Fair'}
                      {currentRating === 3 && 'Good'}
                      {currentRating === 4 && 'Very Good'}
                      {currentRating === 5 && 'Excellent'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Review Text */}
              <View style={styles.reviewTextSection}>
                <Text style={styles.reviewTextLabel}>Share your experience (optional)</Text>
                <View style={styles.reviewTextInputContainer}>
                  <TextInput
                    style={styles.reviewTextInput}
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholder="Tell others about your experience..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <View style={styles.reviewTextCountContainer}>
                    <Text style={styles.reviewTextCount}>{reviewText.length}/500</Text>
                  </View>
                </View>
              </View>

              {/* Error Message */}
              {ratingError && (
                <View style={styles.ratingErrorContainer}>
                  <Text style={styles.ratingErrorText}>{ratingError}</Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.ratingModalFooter}>
              <TouchableOpacity
                style={styles.ratingCancelButton}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.ratingCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingSubmitButton, (ratingSubmitting || currentRating === 0) && styles.ratingSubmitButtonDisabled]}
                onPress={handleRatingSubmit}
                disabled={ratingSubmitting || currentRating === 0}
              >
                {ratingSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Star size={16} color="white" />
                    <Text style={styles.ratingSubmitButtonText}>
                      {userRating ? 'Update Rating' : 'Submit Rating'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Quote Modal */}
      <Modal
        visible={showRequestModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.requestModalContent}>
            <View style={styles.requestModalHeader}>
              <View style={styles.requestModalTitleContainer}>
                <Text style={styles.requestModalTitle}>Request Quote</Text>
                <Text style={styles.requestModalSubtitle}>{selectedPackage?.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRequestModal(false)}
                style={styles.requestModalCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.requestModalBody} showsVerticalScrollIndicator={false}>
              {/* Package Summary */}
              <View style={styles.packageSummaryCard}>
                <View style={styles.packageSummaryHeader}>
                  <Text style={styles.packageSummaryTitle}>{selectedPackage?.title}</Text>
                  <View style={styles.packageSummaryBadge}>
                    <Text style={styles.packageSummaryBadgeText}>
                      {selectedPackage?.pricing_type === 'fixed' ? 'Fixed Price' : 'Per Person'}
                    </Text>
                  </View>
                </View>
                <View style={styles.packageSummaryDetails}>
                  <Text style={styles.packageSummaryPrice}>
                    {selectedPackage?.pricing_type === 'fixed' 
                      ? `₹${selectedPackage?.price?.toLocaleString()}`
                      : `₹${selectedPackage?.price_per_person}/person`
                    }
                  </Text>
                  {selectedPackage?.duration_label && (
                    <Text style={styles.packageSummaryDuration}>
                      • {selectedPackage.duration_label}
                    </Text>
                  )}
                  {selectedPackage?.min_persons && (
                    <Text style={styles.packageSummaryMinPersons}>
                      • Min {selectedPackage.min_persons}
                    </Text>
                  )}
                </View>
              </View>

              {/* Selected Dates */}
              <View style={styles.selectedDatesSection}>
                <Text style={styles.sectionLabel}>Selected Dates *</Text>
                <View style={styles.selectedDatesContainer}>
                  {selectedDates.map(date => (
                    <View key={date} style={styles.selectedDateBadge}>
                      <Text style={styles.selectedDateBadgeText}>{date}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Number of People (for per_person packages) */}
              {selectedPackage?.pricing_type === 'per_person' && (
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Number of People *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={requestForm.numberOfPeople}
                    onChangeText={(text) => setRequestForm(prev => ({ ...prev, numberOfPeople: text }))}
                    placeholder="Enter number of people"
                    keyboardType="numeric"
                    required
                  />
                </View>
              )}

              {/* Additional Information */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Additional Information</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={requestForm.additionalInfo}
                  onChangeText={(text) => setRequestForm(prev => ({ ...prev, additionalInfo: text }))}
                  placeholder="Any special requirements, theme preferences, dietary restrictions, etc."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Request Changes */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Request Changes (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={requestForm.requestChanges}
                  onChangeText={(text) => setRequestForm(prev => ({ ...prev, requestChanges: text }))}
                  placeholder="Any modifications you'd like to request to this package (e.g., different timing, additional services, custom pricing, etc.)"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Contact Information */}
              <View style={styles.contactInfoSection}>
                <Text style={styles.sectionLabel}>Contact Information</Text>
                <View style={styles.contactInfoCard}>
                  <Text style={styles.contactInfoText}>
                    Request will be sent as: <Text style={styles.contactInfoName}>{user?.full_name || 'Viewer'}</Text>
                    {user?.email ? ` • ${user.email}` : ''}
                  </Text>
                </View>
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={requestForm.contactPhone}
                    onChangeText={(text) => setRequestForm(prev => ({ ...prev, contactPhone: text }))}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                    required
                  />
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.requestModalFooter}>
              <TouchableOpacity
                style={styles.requestCancelButton}
                onPress={() => setShowRequestModal(false)}
              >
                <Text style={styles.requestCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.requestSubmitButton, isSubmittingRequest && styles.requestSubmitButtonDisabled]}
                onPress={handleSubmitRequest}
                disabled={isSubmittingRequest}
              >
                {isSubmittingRequest ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.requestSubmitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // bg-gray-50
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100, // Space for bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#f3f4f6',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#be185d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Cover Photo Section
  coverContainer: {
    height: 192, // h-48 sm:h-64
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // bg-black bg-opacity-20
  },
  coverBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(243, 244, 246, 0.8)', // bg-gray-100/80 backdrop-blur-sm
  },
  
  // Profile Section
  profileSection: {
    position: 'relative',
    marginTop: -64, // -mt-16
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: '#f3f4f6', // bg-gray-100
    borderRadius: 16, // rounded-2xl
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb', // border-gray-200
    padding: 24, // p-6
  },
  
  // Profile Picture Section
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePicture: {
    width: 96, // w-24 h-24
    height: 96,
    borderRadius: 48, // rounded-full
    marginTop: -48, // -mt-12
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ec4899', // bg-gradient-to-br from-rose-500 to-pink-600
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827', // text-gray-900
    marginTop: 16,
    textAlign: 'center',
  },
  fullName: {
    fontSize: 16,
    color: '#6b7280', // text-gray-600
    textAlign: 'center',
  },
  
  // Rating Section
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151', // text-gray-700
  },
  ratingCount: {
    fontSize: 12,
    color: '#6b7280', // text-gray-500
  },
  
  // Categories Section
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Location and Website Section
  locationWebsiteContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6', // bg-gradient-to-r from-blue-500 to-cyan-500
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  websiteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981', // bg-gradient-to-r from-green-500 to-emerald-500
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  websiteBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Contact Information Section
  contactInfo: {
    gap: 16,
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#374151', // text-gray-700
  },
  contactTextClickable: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  
  // Action Buttons Section
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  whatsappActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25d366',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  instagramActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e4405f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#e4405f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Contact Icon Buttons
  contactIconButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  whatsappIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25d366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  instagramIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e4405f',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e4405f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // WhatsApp & Instagram Buttons
  placeholderButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  whatsappPlaceholderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25d366',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  instagramPlaceholderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e4405f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#e4405f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholderButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  availabilityButtonContainer: {
    marginBottom: 0,
  },
  availabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb', // bg-blue-600
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  availabilityButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Gallery Section
  gallerySection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  galleryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  
  // Photos Section
  photosSection: {
    marginBottom: 24,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  photosIconContainer: {
    marginRight: 12,
  },
  photosIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#dbeafe', // bg-blue-100
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photosIconText: {
    fontSize: 16,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  
  // Videos Section Styles
  videosSection: {
    marginTop: 16,
  },
  videosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  videosIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videosIcon: {
    fontSize: 12,
  },
  videosTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  videosList: {
    gap: 12,
  },
  videoContainer: {
    marginBottom: 16,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  videoWebViewContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoWebView: {
    width: '100%',
    height: 200,
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
  videoItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  videoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '600',
  },
  videoUrlText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  
  // Image Viewer Modal
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  imageViewerImage: {
    width: '90%',
    height: '70%',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 100,
  },
  sendButton: {
    backgroundColor: '#be185d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  bookingText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  contactButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  
  // Contact Platform Styles
  contactPlatformGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  contactPlatformButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappButton: {
    backgroundColor: '#22c55e', // bg-green-500
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  instagramButton: {
    backgroundColor: '#e4405f', // Instagram gradient
    shadowColor: '#e4405f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#d1d5db', // bg-gray-300
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  platformIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappIcon: {
    fontSize: 24,
  },
  instagramIcon: {
    fontSize: 24,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
  },
  platformTextActive: {
    color: 'white',
  },
  platformTextDisabled: {
    color: '#6b7280', // text-gray-500
  },
  messageInputSection: {
    marginTop: 8,
  },
  messageInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  
  // Booking Modal Styles
  bookingModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  bookingModalBody: {
    maxHeight: 600,
    paddingHorizontal: 16,
  },
  
  // Calendar Styles
  availabilityCalendarSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  availabilityCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  availabilityCalendarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  calendarNavText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    width: '13.5%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '13.5%',
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    marginHorizontal: 0.5,
    position: 'relative',
  },
  calendarDayEmpty: {
    backgroundColor: 'transparent',
  },
  calendarDaySelected: {
    backgroundColor: 'rgba(190, 24, 93, 0.15)',
    borderWidth: 2,
    borderColor: '#be185d',
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  calendarDayBooked: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  calendarDayBlocked: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  calendarDayOff: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  calendarDayAvailable: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  calendarDayTextSelected: {
    color: '#be185d',
    fontWeight: '700',
  },
  calendarDayTextBlocked: {
    color: '#ef4444',
  },
  calendarDayTextOff: {
    color: '#9ca3af',
  },
  bookingIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  selectedDatesContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedDatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  selectedDatesTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1d4ed8',
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  selectedDateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedDateText: {
    fontSize: 10,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  
  packagesSection: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  packagesList: {
    gap: 16,
  },
  packageItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#be185d',
    backgroundColor: '#fdf2f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  packageDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  packageDeliverables: {
    marginBottom: 16,
  },
  packageDeliverableItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  requestPackageButton: {
    backgroundColor: '#be185d',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestPackageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  availabilitySection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  availabilityText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactVendorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#be185d',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  contactVendorButtonText: {
    color: '#be185d',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Ratings Section Styles
  ratingsSection: {
    marginTop: 16,
  },
  ratingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ratingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  ratingsContent: {
    alignItems: 'center',
  },
  ratingsStats: {
    alignItems: 'center',
    gap: 8,
  },
  ratingsAverage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  ratingsStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingsCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // Package Styles
  packageDuration: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  packageDeliverables: {
    marginBottom: 12,
  },
  packageDeliverableItem: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    lineHeight: 16,
  },
  noPackagesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noPackagesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  noPackagesSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  
  // Reviews Section Styles
  reviewsSection: {
    marginTop: 12,
    marginBottom: 100,
    paddingBottom: 50,
  },
  reviewsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  reviewsBadge: {
    backgroundColor: '#be185d',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  reviewsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#be185d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  ratingSummary: {
    marginBottom: 20,
  },
  ratingMainStats: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingNumberContainer: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  ratingAverage: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  ratingDistribution: {
    gap: 16,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingVertical: 2,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    width: 36,
    height: 36,
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  ratingBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 8,
  },
  ratingBarCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    width: 36,
    textAlign: 'right',
    minWidth: 36,
  },
  reviewsList: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  reviewsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewsListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  showAllButtonText: {
    fontSize: 11,
    color: '#be185d',
    fontWeight: '500',
  },
  reviewsContainer: {
    gap: 12,
  },
  reviewItem: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  reviewerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#be185d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 1,
    marginBottom: 3,
  },
  reviewDate: {
    fontSize: 11,
    color: '#6b7280',
  },
  reviewText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noReviewsText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    marginBottom: 12,
  },
  firstReviewButton: {
    backgroundColor: '#be185d',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 5,
  },
  firstReviewButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  
  // Get in Touch Section Styles
  getInTouchSection: {
    marginTop: 16,
    marginBottom: 100,
    paddingBottom: 50,
  },
  getInTouchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  getInTouchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  getInTouchButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  getInTouchWhatsAppButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25d366',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  getInTouchInstagramButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e4405f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#e4405f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  getInTouchButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  
  // Rating Modal Styles
  ratingModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 16,
    maxHeight: '85%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  ratingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  ratingModalTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ratingModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  ratingModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
  },
  ratingModalBody: {
    flex: 1,
    padding: 24,
  },
  starRatingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  starRatingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
  },
  starRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
    borderRadius: 20,
  },
  ratingLabelContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  reviewTextSection: {
    marginBottom: 24,
  },
  reviewTextLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  reviewTextInputContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  reviewTextInput: {
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  reviewTextCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  reviewTextCount: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  reviewTextContainer: {
    marginBottom: 16,
  },
  reviewTextLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  reviewTextInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  reviewTextCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  ratingErrorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  ratingErrorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  ratingModalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  ratingCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  ratingSubmitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#be185d',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  ratingSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // Request Quote Modal Styles
  requestModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 16,
    maxHeight: '90%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  requestModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#be185d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  requestModalTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  requestModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  requestModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  requestModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  requestModalBody: {
    flex: 1,
    padding: 24,
  },
  requestModalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  requestCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  requestSubmitButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#be185d',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestSubmitButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  requestSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // Request Form Styles
  packageSummaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  packageSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  packageSummaryBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  packageSummaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  packageSummaryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  packageSummaryPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  packageSummaryDuration: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  packageSummaryMinPersons: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  selectedDatesSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectedDatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedDateBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedDateBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  contactInfoSection: {
    marginBottom: 20,
  },
  contactInfoCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactInfoText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  contactInfoName: {
    fontWeight: '600',
    color: '#111827',
  },
});
