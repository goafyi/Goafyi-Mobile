import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native';
import { Search, MapPin, Star } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { VendorService, VendorWithUser } from '../services/vendorService';
import { CATEGORIES } from '../constants';

export default function HomeScreen() {
  const { user } = useSupabase();
  const [vendors, setVendors] = useState<VendorWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadVendors();
  }, [selectedCategory]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const result = await VendorService.getVendors({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        limit: 20
      });
      setVendors(result.vendors);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderVendorCard = (vendor: VendorWithUser) => (
    <TouchableOpacity
      key={vendor.id}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4"
    >
      <View className="flex-row">
        <Image
          source={{ uri: vendor.portfolio_images?.[0] || 'https://via.placeholder.com/80' }}
          className="w-20 h-20 rounded-lg"
          resizeMode="cover"
        />
        <View className="flex-1 ml-3">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {vendor.business_name}
          </Text>
          <Text className="text-sm text-gray-600 mb-1">{vendor.category}</Text>
          <View className="flex-row items-center mb-1">
            <MapPin size={12} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">{vendor.location}</Text>
          </View>
          {vendor.rating && (
            <View className="flex-row items-center">
              <Star size={12} color="#fbbf24" fill="#fbbf24" />
              <Text className="text-xs text-gray-600 ml-1">
                {vendor.rating.toFixed(1)} ({vendor.review_count} reviews)
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeSubtext}>
              Welcome back
            </Text>
            <Text style={styles.welcomeName}>
              {user?.full_name || 'User'}
            </Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        <View className="flex-row px-3 py-2">
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`px-3 py-2 rounded-full mr-2 min-h-[36px] justify-center ${
                selectedCategory === category
                  ? 'bg-primary-600'
                  : 'bg-gray-100'
              }`}
              style={{ minWidth: 60 }} // Ensure minimum touch target
            >
              <Text
                className={`text-xs font-medium ${
                  selectedCategory === category
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Vendors List */}
      <ScrollView className="flex-1 px-4 py-4 pb-24">
        {loading ? (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">Loading vendors...</Text>
          </View>
        ) : vendors.length > 0 ? (
          vendors.map(renderVendorCard)
        ) : (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">No vendors found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 36,
  },
  searchInput: {
    flex: 1,
    marginLeft: 4,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  categoriesContainer: {
    backgroundColor: 'transparent',
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#be185d',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  avatarText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
