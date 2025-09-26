import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Welcome{user?.full_name ? `, ${user.full_name}` : ''}!
        </Text>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-900"
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
        className="bg-white border-b border-gray-200"
      >
        <View className="flex-row px-4 py-2">
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedCategory === category
                  ? 'bg-primary-600'
                  : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
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
