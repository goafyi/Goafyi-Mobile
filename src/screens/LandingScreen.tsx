import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Search, MessageCircle } from 'lucide-react-native';
import { VendorService, type VendorWithUser } from '../services/vendorService';
import { RatingService } from '../services/ratingService';
import { CategoryCarousel } from '../components/CategoryCarousel';
import { useSupabase } from '../context/SupabaseContext';

type InitialRatings = Record<string, { average_rating: number; total_ratings: number }>;

interface LandingScreenProps {
  navigation?: any;
}

export default function LandingScreen({ navigation }: LandingScreenProps) {
  const { user } = useSupabase();
  const insets = useSafeAreaInsets();
  const [vendors, setVendors] = useState<VendorWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [vendorRatings, setVendorRatings] = useState<Record<string, { average_rating: number; total_ratings: number }>>({});
  const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null);

  // Load vendors from Supabase (lite) - exactly like the original
  useEffect(() => {
    const loadVendors = async () => {
      try {
        setLoading(true);
        // Fetch minimal fields for performance (now with caching)
        const lite = await VendorService.getVendorsLite();
        // Coerce to VendorWithUser-compatible shape where needed
        setVendors(lite as any);
        
        // Load ratings for all vendors
        const ratings: Record<string, { average_rating: number; total_ratings: number }> = {};
        
        for (const vendor of lite as any[]) {
          try {
            // Load rating stats
            const ratingStats = await RatingService.getVendorRatingStats(vendor.id);
            if (ratingStats) {
              ratings[vendor.id] = {
                average_rating: ratingStats.average_rating,
                total_ratings: ratingStats.total_ratings
              };
            } else {
              ratings[vendor.id] = { average_rating: 0, total_ratings: 0 };
            }
          } catch (error) {
            console.error(`Error loading data for vendor ${vendor.id}:`, error);
            ratings[vendor.id] = { average_rating: 0, total_ratings: 0 };
          }
        }
        setVendorRatings(ratings);
      } catch (error) {
        console.error('Error loading vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVendors();
  }, []);

  // Filter vendors based on search and category - exactly like the original
  const filteredVendors = useMemo(() => {
    let filtered = vendors;
    
    // Filter by category (only if not a special filter)
    if (activeCategory !== 'All' && !activeCategory.startsWith('Rating-') && !activeCategory.startsWith('Location-')) {
      filtered = filtered.filter(vendor => {
        if (!vendor.category) return false;
        // Handle comma-separated categories
        const categories = vendor.category.split(',').map(cat => cat.trim().toLowerCase());
        return categories.includes(activeCategory.toLowerCase());
      });
    }
    
    // Apply special filters
    if (activeFilter) {
      switch (activeFilter.type) {
        case 'Rating':
          if (activeFilter.value === 'highest') {
            filtered = filtered.sort((a, b) => {
              const ratingA = vendorRatings[a.id]?.average_rating || 0;
              const ratingB = vendorRatings[b.id]?.average_rating || 0;
              return ratingB - ratingA;
            });
          } else if (activeFilter.value === 'lowest') {
            filtered = filtered.sort((a, b) => {
              const ratingA = vendorRatings[a.id]?.average_rating || 0;
              const ratingB = vendorRatings[b.id]?.average_rating || 0;
              return ratingA - ratingB;
            });
          }
          break;
          
        case 'Location':
          // For now, just sort by business name since we don't have location coordinates
          filtered = filtered.sort((a, b) => a.business_name.localeCompare(b.business_name));
          break;
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vendor => 
        vendor.business_name.toLowerCase().includes(query) ||
        (vendor.category && vendor.category.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [vendors, activeCategory, searchQuery, activeFilter, vendorRatings]);

  const handleVendorClick = (vendor: VendorWithUser) => {
    // Navigate to vendor profile
    if (navigation) {
      navigation.navigate('vendor-profile', vendor.id);
    }
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
    setSearchQuery(''); // Clear search when changing category
    setSearchInput(''); // Clear search input when changing category
    
    // Parse special filter commands
    if (category.startsWith('Rating-')) {
      const ratingType = category.replace('Rating-', '');
      if (ratingType === 'none') {
        setActiveFilter(null);
      } else {
        setActiveFilter({ type: 'Rating', value: ratingType });
      }
    } else if (category.startsWith('Location-')) {
      const locationRadius = category.replace('Location-', '');
      setActiveFilter({ type: 'Location', value: locationRadius });
    } else {
      // Regular category selection
      setActiveFilter(null);
    }
  };

  const handleSearchInputChange = (query: string) => {
    setSearchInput(query);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    if (searchInput.trim()) {
      setActiveCategory('All'); // Reset category when searching
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'sm') => {
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
            color={star <= rating ? '#fbbf24' : '#d1d5db'}
            fill={star <= rating ? '#fbbf24' : 'transparent'}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.spinner} />
          <Text style={styles.loadingText}>Loading vendors...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Search and Categories (sticky search on mobile) */}
        <View style={styles.searchSection}>
          {/* Sticky Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <View style={styles.searchInputWrapper}>
                <TextInput
                  placeholder="Search vendors, locations, or services..."
                  value={searchInput}
                  onChangeText={handleSearchInputChange}
                  onSubmitEditing={handleSearch}
                  style={styles.searchInput}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <TouchableOpacity
                onPress={handleSearch}
                style={styles.searchButton}
              >
                <Search size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <CategoryCarousel 
            activeCategory={activeCategory}
            onSelectCategory={handleCategorySelect}
          />
        </View>

        {/* All Results */}
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeader}>
            <View style={styles.resultsTitleContainer}>
              <Text style={styles.resultsTitle}>
                {activeCategory === 'All' ? 'All Vendors' : activeCategory}
              </Text>
              <Text style={styles.resultsCount}>
                ({filteredVendors.length} {filteredVendors.length === 1 ? 'vendor' : 'vendors'})
              </Text>
            </View>
            {filteredVendors.length > 0 && (
              <View style={styles.resultsIndicator} />
            )}
          </View>

          {filteredVendors.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Search size={48} color="#9ca3af" />
              </View>
              <Text style={styles.emptyTitle}>No vendors found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim() 
                  ? `No vendors match your search for "${searchQuery}"`
                  : `No vendors found in the ${activeCategory} category`
                }
              </Text>
              <View style={styles.emptyActions}>
                {searchQuery.trim() && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSearchInput('');
                    }}
                    style={styles.emptyButtonSecondary}
                  >
                    <Text style={styles.emptyButtonSecondaryText}>Clear Search</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setActiveCategory('All')}
                  style={styles.emptyButtonPrimary}
                >
                  <Text style={styles.emptyButtonPrimaryText}>View All Vendors</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.vendorsGrid}>
              {filteredVendors.map((vendor: any) => (
                <View key={vendor.id} style={styles.vendorCardWrapper}>
                  <TouchableOpacity 
                    style={styles.vendorCard}
                    onPress={() => handleVendorClick(vendor)}
                  >
                    {/* Image Container */}
                    <View style={styles.vendorImageContainer}>
                      {vendor.portfolio_images && vendor.portfolio_images[0] ? (
                        <Image 
                          source={{ uri: vendor.portfolio_images[0] }}
                          style={styles.vendorImage}
                          resizeMode="cover"
                          onError={(error) => console.log('Image load error:', error)}
                          onLoad={() => console.log('Image loaded successfully')}
                        />
                      ) : (
                        <View style={styles.vendorImagePlaceholder}>
                          <Text style={styles.placeholderText}>No Image</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  {/* Text below the card */}
                  <View style={styles.vendorTextContainer}>
                    <Text style={styles.vendorName} numberOfLines={1}>
                      {vendor.business_name || 'Business Name'}
                    </Text>
                    <Text style={styles.vendorCategory} numberOfLines={1}>
                      {vendor.category || 'Category'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // min-h-screen bg-gray-50
    paddingBottom: 80, // pb-20 for bottom nav
  },
  content: {
    maxWidth: 768, // max-w-6xl
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 12, // px-3 sm:px-4
    paddingVertical: 16, // py-4 sm:py-6
    gap: 20, // space-y-5
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  spinner: {
    width: 48,
    height: 48,
    borderWidth: 3,
    borderColor: '#e5e7eb',
    borderTopColor: '#be185d', // border-rose-600
    borderRadius: 24,
    marginBottom: 16,
  },
  loadingText: {
    color: '#6b7280', // text-gray-600
    fontSize: 16,
  },
  searchSection: {
    gap: 12, // space-y-3
  },
  searchContainer: {
    // sticky positioning equivalent
  },
  searchBar: {
    backgroundColor: '#f3f4f6', // bg-gray-100
    borderRadius: 12, // rounded-xl
    padding: 12, // p-3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // border-white/20
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // gap-2
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    paddingVertical: 8, // py-2
    paddingHorizontal: 12, // pl-3 pr-3
    fontSize: 14, // text-sm
    color: '#1f2937', // text-gray-900
    backgroundColor: '#f3f4f6', // bg-gray-100
    borderRadius: 8, // rounded-lg
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // border-white/30
  },
  searchButton: {
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    backgroundColor: '#be185d', // bg-rose-700/90
    borderRadius: 8, // rounded-lg
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsSection: {
    gap: 16, // space-y-4
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 24, // text-2xl
    fontWeight: 'bold',
    color: '#1f2937', // text-gray-900
  },
  resultsCount: {
    fontSize: 18, // text-lg
    fontWeight: 'normal',
    color: '#6b7280', // text-gray-500
    marginLeft: 8, // ml-2
  },
  resultsIndicator: {
    width: 32, // w-8
    height: 4, // h-1
    backgroundColor: '#be185d', // bg-gradient-to-r from-rose-500 to-rose-700
    borderRadius: 2, // rounded-full
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48, // py-12
  },
  emptyIconContainer: {
    width: 96, // w-24
    height: 96, // h-24
    backgroundColor: '#f3f4f6', // bg-gray-100
    borderRadius: 48, // rounded-full
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16, // mb-4
  },
  emptyTitle: {
    fontSize: 18, // text-lg
    fontWeight: '600',
    color: '#1f2937', // text-gray-900
    marginBottom: 8, // mb-2
  },
  emptySubtitle: {
    color: '#6b7280', // text-gray-500
    textAlign: 'center',
    marginBottom: 24, // mb-6
    paddingHorizontal: 16,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12, // space-x-3
  },
  emptyButtonSecondary: {
    backgroundColor: '#f3f4f6', // bg-gray-100
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 8, // rounded-lg
  },
  emptyButtonSecondaryText: {
    color: '#374151', // text-gray-700
    fontWeight: '500',
  },
  emptyButtonPrimary: {
    backgroundColor: '#be185d', // bg-rose-700
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 8, // rounded-lg
  },
  emptyButtonPrimaryText: {
    color: 'white',
    fontWeight: '500',
  },
  vendorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12, // gap-3 sm:gap-6
    paddingHorizontal: 16, // Add margins to left and right
    paddingBottom: 100, // Add padding below to prevent overlap with bottom navigation
  },
  vendorCardWrapper: {
    width: '47%', // grid-cols-2
    marginBottom: 16,
  },
  vendorCard: {
    borderRadius: 12, // Rounded corners like in the image
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  vendorImageContainer: {
    height: 120,
    width: '100%',
    backgroundColor: '#f0f0f0', // Fallback background
  },
  vendorImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  vendorImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  vendorTextContainer: {
    paddingTop: 8,
    paddingHorizontal: 0,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
    textAlign: 'center',
  },
  vendorCategory: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '400',
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // gap-1
    marginTop: 2, // mt-0.5
  },
  ratingText: {
    fontSize: 12, // text-xs
    color: '#374151', // text-gray-700
    fontWeight: '500',
  },
  ratingTextEmpty: {
    fontSize: 12, // text-xs
    color: '#6b7280', // text-gray-500
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1, // space-x-0.5
  },
});