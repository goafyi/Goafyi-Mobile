import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { X, List, ChevronUp, ChevronDown, MapPin, Star } from 'lucide-react-native';
import { CATEGORIES } from '../constants';
import { VendorService } from '../services/vendorService';

interface CategoryCarouselProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryCarousel({ activeCategory, onSelectCategory }: CategoryCarouselProps) {
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [showViewPopup, setShowViewPopup] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>(['All']);

  // Goa locations structure
  const goaLocations = {
    'North Goa': {
      'Pernem Taluka': ['Mandrem', 'Arambol', 'Ashvem', 'Morjim', 'Pernem town', 'Tuem'],
      'Bardez Taluka': ['Mapusa', 'Calangute', 'Candolim', 'Baga', 'Siolim', 'Anjuna', 'Vagator', 'Saligao', 'Parra', 'Aldona', 'Porvorim'],
      'Tiswadi Taluka': ['Panaji (Panjim)', 'Taleigao (incl. Dona Paula)', 'Santa Cruz (Merces)', 'St. Andre (Goa Velha, Curca–Bambolim–Talaulim)', 'Cumbarjua', 'Old Goa'],
      'Bicholim Taluka': ['Bicholim', 'Mayem'],
      'Sattari Taluka': ['Valpoi', 'Poriem', 'Sanquelim (nearby)'],
      'Ponda Taluka': ['Ponda', 'Priol (Mardol)', 'Marcaim', 'Shiroda']
    },
    'South Goa': {
      'Salcete Taluka': ['Margao', 'Fatorda', 'Navelim', 'Benaulim', 'Colva', 'Varca', 'Orlim', 'Betalbatim', 'Sernabatim', 'Carmona', 'Cavelossim', 'Nuvem', 'Curtorim', 'Raia', 'Loutolim', 'Verna'],
      'Mormugao Taluka': ['Vasco da Gama', 'Dabolim', 'Chicalim', 'Cortalim', 'Mormugao'],
      'Quepem / Mining Belt': ['Quepem', 'Curchorem', 'Sanvordem'],
      'Sanguem Taluka': ['Sanguem'],
      'Canacona Taluka': ['Canacona (Chaudi)', 'Palolem', 'Agonda', 'Poinguinim']
    }
  };

  // Load available categories from database and merge with constants
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const dbCategories = await VendorService.getCategories();
        console.log('Raw categories from DB:', dbCategories);
        
        // Extract individual categories from comma-separated strings
        const dbCategorySet = new Set<string>();
        dbCategories.forEach(catString => {
          if (catString) {
            catString.split(',').forEach(cat => {
              const trimmed = cat.trim();
              if (trimmed) dbCategorySet.add(trimmed);
            });
          }
        });
        
        // Start with all predefined categories from constants
        const allCategories = new Set(CATEGORIES.filter(cat => cat !== 'All'));
        
        // Add any additional categories found in the database
        dbCategorySet.forEach(cat => allCategories.add(cat as any));
        
        const finalCategories = ['All', ...Array.from(allCategories).sort()];
        console.log('Final categories:', finalCategories);
        console.log('Setting available categories:', finalCategories);
        setAvailableCategories(finalCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to constants if database fails
        setAvailableCategories([...CATEGORIES]);
      }
    };
    loadCategories();
  }, []);

  const handleCategorySelect = (category: string) => {
    onSelectCategory(category);
    setShowCategoryList(false);
  };

  const handleViewSelect = (viewType: string) => {
    if (viewType === 'none') {
      onSelectCategory('All');
    } else {
      onSelectCategory(`View-${viewType}`);
    }
    setShowViewPopup(false);
  };

  const handleRatingSelect = (ratingType: string) => {
    if (ratingType === 'none') {
      onSelectCategory('All');
    } else {
      onSelectCategory(`Rating-${ratingType}`);
    }
    setShowRatingPopup(false);
  };

  const handleLocationSelect = (location: string) => {
    onSelectCategory(`Location-${location}`);
    setShowLocationPopup(false);
  };

  console.log('CategoryCarousel render - availableCategories:', availableCategories);
  
  return (
    <>
      <View style={styles.container}>
        <View style={styles.buttonRow}>
          {/* All button */}
          <TouchableOpacity
            onPress={() => onSelectCategory('All')}
            style={[
              styles.button,
              activeCategory === 'All' ? styles.buttonActive : styles.buttonInactive
            ]}
          >
            <Text style={[
              styles.buttonText,
              activeCategory === 'All' ? styles.buttonTextActive : styles.buttonTextInactive
            ]}>
              All
            </Text>
          </TouchableOpacity>

          {/* Categories button */}
          <TouchableOpacity
            onPress={() => setShowCategoryList(true)}
            style={[styles.button, styles.buttonInactive]}
          >
            <List size={12} color="#6b7280" />
            <Text style={styles.buttonTextInactive}>Categories</Text>
          </TouchableOpacity>

          {/* Sort button */}
          <TouchableOpacity
            onPress={() => setShowViewPopup(true)}
            style={[
              styles.button,
              activeCategory.startsWith('View-') ? styles.buttonActiveBlue : styles.buttonInactive
            ]}
          >
            <Text style={[
              styles.buttonText,
              activeCategory.startsWith('View-') ? styles.buttonTextActive : styles.buttonTextInactive
            ]}>
              Sort
            </Text>
          </TouchableOpacity>

          {/* Rating button */}
          <TouchableOpacity
            onPress={() => setShowRatingPopup(true)}
            style={[
              styles.button,
              activeCategory.startsWith('Rating-') ? styles.buttonActiveYellow : styles.buttonInactive
            ]}
          >
            <Text style={[
              styles.buttonText,
              activeCategory.startsWith('Rating-') ? styles.buttonTextActive : styles.buttonTextInactive
            ]}>
              Rating
            </Text>
          </TouchableOpacity>

          {/* Location button */}
          <TouchableOpacity
            onPress={() => setShowLocationPopup(true)}
            style={[
              styles.button,
              activeCategory.startsWith('Location-') ? styles.buttonActiveGreen : styles.buttonInactive
            ]}
          >
            <Text style={[
              styles.buttonText,
              activeCategory.startsWith('Location-') ? styles.buttonTextActive : styles.buttonTextInactive
            ]}>
              Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category List Modal */}
      <Modal
        visible={showCategoryList}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryList(false)}
      >
        <View style={styles.simpleModalOverlay}>
          <View style={styles.simpleModalContent}>
            <View style={styles.simpleModalHeader}>
              <Text style={styles.simpleModalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryList(false)}
                style={styles.simpleCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.simpleModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.simpleCategoryGrid}>
                {['All', 'Catering', 'Makeup Artist', 'Solo Artist', 'Wedding Planner', 'Photographer', 'DJ', 'Decorator', 'Florist', 'Venue', 'Band', 'Emcee', 'Cameraman', 'Suit Designer', 'Gown Designer', 'Bridesmaid Dresses', 'Best Man Suits', 'Accessories', 'Bar Services'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => handleCategorySelect(category)}
                    style={[
                      styles.simpleCategoryButton,
                      activeCategory === category ? styles.simpleCategoryButtonActive : styles.simpleCategoryButtonInactive
                    ]}
                  >
                    <Text style={[
                      styles.simpleCategoryButtonText,
                      activeCategory === category ? styles.simpleCategoryButtonTextActive : styles.simpleCategoryButtonTextInactive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Popup Modal */}
      <Modal
        visible={showViewPopup}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowViewPopup(false)}
      >
        <View style={styles.simpleModalOverlay}>
          <View style={styles.simpleModalContent}>
            <View style={styles.simpleModalHeader}>
              <Text style={styles.simpleModalTitle}>Sort by View</Text>
              <TouchableOpacity
                onPress={() => setShowViewPopup(false)}
                style={styles.simpleCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.simpleModalBody}>
              <TouchableOpacity
                onPress={() => handleViewSelect('none')}
                style={styles.simpleOptionButton}
              >
                <X size={20} color="#6b7280" />
                <Text style={styles.simpleOptionText}>None</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleViewSelect('highest')}
                style={styles.simpleOptionButton}
              >
                <ChevronUp size={20} color="#2563eb" />
                <Text style={styles.simpleOptionText}>Highest to Lowest</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleViewSelect('lowest')}
                style={styles.simpleOptionButton}
              >
                <ChevronDown size={20} color="#2563eb" />
                <Text style={styles.simpleOptionText}>Lowest to Highest</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Popup Modal */}
      <Modal
        visible={showRatingPopup}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRatingPopup(false)}
      >
        <View style={styles.simpleModalOverlay}>
          <View style={styles.simpleModalContent}>
            <View style={styles.simpleModalHeader}>
              <Text style={styles.simpleModalTitle}>Sort by Rating</Text>
              <TouchableOpacity
                onPress={() => setShowRatingPopup(false)}
                style={styles.simpleCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.simpleModalBody}>
              <TouchableOpacity
                onPress={() => handleRatingSelect('none')}
                style={styles.simpleOptionButton}
              >
                <X size={20} color="#6b7280" />
                <Text style={styles.simpleOptionText}>None</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleRatingSelect('highest')}
                style={styles.simpleOptionButton}
              >
                <Star size={20} color="#fbbf24" />
                <Text style={styles.simpleOptionText}>Highest Rated</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleRatingSelect('lowest')}
                style={styles.simpleOptionButton}
              >
                <Star size={20} color="#fbbf24" />
                <Text style={styles.simpleOptionText}>Lowest Rated</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Popup Modal */}
      <Modal
        visible={showLocationPopup}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationPopup(false)}
      >
        <View style={styles.simpleModalOverlay}>
          <View style={styles.simpleModalContent}>
            <View style={styles.simpleModalHeader}>
              <Text style={styles.simpleModalTitle}>Choose Location</Text>
              <TouchableOpacity
                onPress={() => setShowLocationPopup(false)}
                style={styles.simpleCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.simpleModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.locationContent}>
                {Object.entries(goaLocations).map(([district, talukas]) => (
                  <View key={district} style={styles.districtSection}>
                    <Text style={styles.districtTitle}>{district}</Text>
                    {Object.entries(talukas).map(([taluka, places]) => (
                      <View key={taluka} style={styles.talukaSection}>
                        <Text style={styles.talukaTitle}>{taluka}</Text>
                        <View style={styles.placesGrid}>
                          {places.map((place) => (
                            <TouchableOpacity
                              key={place}
                              onPress={() => handleLocationSelect(place)}
                              style={[
                                styles.placeButton,
                                activeCategory === `Location-${place}` ? styles.placeButtonActive : styles.placeButtonInactive
                              ]}
                            >
                              <Text style={[
                                styles.placeButtonText,
                                activeCategory === `Location-${place}` ? styles.placeButtonTextActive : styles.placeButtonTextInactive
                              ]}>
                                {place}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12, // rounded-xl
    padding: 12, // p-3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb', // border-gray-200
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6, // gap-1.5
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 12, // px-3
    paddingVertical: 6, // py-1.5
    borderRadius: 8, // rounded-lg
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // gap-1.5
  },
  buttonActive: {
    backgroundColor: '#be185d', // bg-rose-600
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonActiveBlue: {
    backgroundColor: '#2563eb', // bg-blue-600
  },
  buttonActiveYellow: {
    backgroundColor: '#d97706', // bg-yellow-600
  },
  buttonActiveGreen: {
    backgroundColor: '#059669', // bg-green-600
  },
  buttonInactive: {
    backgroundColor: '#f9fafb', // bg-gray-50
    borderWidth: 1,
    borderColor: '#e5e7eb', // border-gray-200
  },
  buttonText: {
    fontSize: 12, // text-xs
    fontWeight: '500',
  },
  buttonTextActive: {
    color: 'white',
  },
  buttonTextInactive: {
    color: '#6b7280', // text-gray-600
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '95%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignSelf: 'center',
    marginVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  modalBody: {
    flex: 1,
    padding: 16,
    maxHeight: 400,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#be185d',
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryButtonInactive: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  categoryButtonTextInactive: {
    color: '#6b7280',
  },
  optionList: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    gap: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  locationContent: {
    gap: 24,
  },
  distanceDisplay: {
    alignItems: 'center',
  },
  distanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
  },
  distanceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#059669',
    borderRadius: 12,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  // Simple modal styles for mobile
  simpleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  simpleModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  simpleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  simpleModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  simpleCloseButton: {
    padding: 4,
  },
  simpleModalBody: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  simpleCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  simpleCategoryButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  simpleCategoryButtonActive: {
    backgroundColor: '#be185d',
    borderColor: '#be185d',
  },
  simpleCategoryButtonInactive: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  simpleCategoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  simpleCategoryButtonTextActive: {
    color: 'white',
  },
  simpleCategoryButtonTextInactive: {
    color: '#374151',
  },
  simpleOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  simpleOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  simpleDistanceDisplay: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  simpleDistanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#be185d',
    marginBottom: 4,
  },
  simpleDistanceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  simpleApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#be185d',
    borderRadius: 12,
    gap: 8,
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  simpleApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Location styles
  locationContent: {
    gap: 20,
  },
  districtSection: {
    marginBottom: 16,
  },
  districtTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#be185d',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#fce7f3',
  },
  talukaSection: {
    marginBottom: 16,
    paddingLeft: 8,
  },
  talukaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    paddingLeft: 8,
  },
  placesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 16,
  },
  placeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  placeButtonActive: {
    backgroundColor: '#be185d',
    borderColor: '#be185d',
  },
  placeButtonInactive: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  placeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  placeButtonTextActive: {
    color: 'white',
  },
  placeButtonTextInactive: {
    color: '#374151',
  },
});
