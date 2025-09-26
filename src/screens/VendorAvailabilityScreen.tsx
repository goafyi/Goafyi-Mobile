import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Plus, X, Clock, Package, Edit3, Trash2 } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { AvailabilityService, type AvailabilitySettingsRecord, type BlockedDateRecord } from '../services/availabilityService';
import { PackageService, type PackageRecord } from '../services/packageService';
import { BookingService, type BookingWithDetails } from '../services/bookingService';
import { AuthService } from '../services/authService';

interface VendorAvailabilityScreenProps {
  navigation?: any;
}

export default function VendorAvailabilityScreen({ navigation }: VendorAvailabilityScreenProps) {
  const { user } = useSupabase();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'packages' | 'availability'>('packages');
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(false);
  
  // Availability state
  const [availabilitySettings, setAvailabilitySettings] = useState<AvailabilitySettingsRecord | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDateRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, BookingWithDetails[]>>({});
  
  // Packages state
  const [packages, setPackages] = useState<(PackageRecord & { package_extras: any[] })[]>([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageRecord | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  
  // Package form state
  const [packageTitle, setPackageTitle] = useState('');
  const [packagePrice, setPackagePrice] = useState<number>(0);
  const [packagePricingType, setPackagePricingType] = useState<'fixed' | 'per_person'>('fixed');
  const [packagePricePerPerson, setPackagePricePerPerson] = useState<number>(0);
  const [packageMinPersons, setPackageMinPersons] = useState<number | undefined>(undefined);
  const [packageDuration, setPackageDuration] = useState('');
  const [packageDeliverables, setPackageDeliverables] = useState('');
  const [packageExtras, setPackageExtras] = useState<Array<{
    name: string;
    available_qty?: number;
    price_per_unit?: number;
  }>>([]);
  const [packageTerms, setPackageTerms] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Get vendor ID
        const vendorIdResult = await AuthService.getVendorId(user.id);
        setVendorId(vendorIdResult);
        
        if (vendorIdResult) {
          // Load packages
          const packagesData = await PackageService.getVendorPackages(vendorIdResult);
          setPackages(packagesData);
          
          // Load availability settings
          const settings = await AvailabilityService.getSettings(vendorIdResult);
          setAvailabilitySettings(settings);
          
          // Load blocked dates
          const blocked = await AvailabilityService.listBlockedDates(vendorIdResult);
          console.log('VendorAvailabilityScreen: Loaded blocked dates:', blocked);
          console.log('VendorAvailabilityScreen: Vendor ID:', vendorIdResult);
          setBlockedDates(blocked);
              
              // Load bookings
              await loadBookings();
            }
            
          } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
          } finally {
            setLoading(false);
          }
        };

        loadData();
      }, [user?.id]);

      // Reload bookings when month changes
      useEffect(() => {
        if (vendorId) {
          loadBookings();
        }
      }, [currentMonth, vendorId]);

  const handleToggleDate = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const handleBlockDates = async () => {
    if (selectedDates.length === 0) {
      Alert.alert('No Dates Selected', 'Please select dates to block');
      return;
    }

    try {
      await AvailabilityService.addBlockedDates(vendorId!, selectedDates, 'Blocked by vendor');
      setBlockedDates(prev => [
        ...prev,
        ...selectedDates.map(date => ({
          id: '',
          vendor_id: vendorId!,
          date,
          reason: 'Blocked by vendor',
          created_at: new Date().toISOString()
        }))
      ]);
      setSelectedDates([]);
      Alert.alert('Success', 'Dates blocked successfully');
    } catch (error) {
      console.error('Error blocking dates:', error);
      Alert.alert('Error', 'Failed to block dates');
    }
  };

  const handleUnblockDate = async (date: string) => {
    try {
      await AvailabilityService.removeBlockedDates(vendorId!, [date]);
      setBlockedDates(prev => prev.filter(b => b.date !== date));
      Alert.alert('Success', 'Date unblocked successfully');
    } catch (error) {
      console.error('Error unblocking date:', error);
      Alert.alert('Error', 'Failed to unblock date');
    }
  };

  // Package management functions
  const handleCreatePackage = () => {
    setEditingPackage(null);
    setPackageTitle('');
    setPackagePrice(0);
    setPackagePricingType('fixed');
    setPackagePricePerPerson(0);
    setPackageMinPersons(undefined);
    setPackageDuration('');
    setPackageDeliverables('');
    setPackageExtras([]);
    setPackageTerms('');
    setShowPackageModal(true);
  };

  const handleEditPackage = (pkg: PackageRecord & { package_extras: any[] }) => {
    setEditingPackage(pkg);
    setPackageTitle(pkg.title);
    setPackagePrice(pkg.price || 0);
    setPackagePricingType(pkg.pricing_type);
    setPackagePricePerPerson(pkg.price_per_person || 0);
    setPackageMinPersons(pkg.min_persons || undefined);
    setPackageDuration(pkg.duration_label || '');
    setPackageDeliverables(pkg.deliverables?.join(', ') || '');
    setPackageExtras(pkg.package_extras || []);
    setPackageTerms(pkg.terms || '');
    setShowPackageModal(true);
  };

  const handleSavePackage = async () => {
    if (!vendorId) return;
    
    try {
      setPackagesLoading(true);
      
      const deliverables = packageDeliverables
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      
      const packageData = {
        vendor_id: vendorId,
        title: packageTitle,
        pricing_type: packagePricingType,
        price: packagePricingType === 'fixed' ? packagePrice : null,
        price_per_person: packagePricingType === 'per_person' ? packagePricePerPerson : null,
        min_persons: packageMinPersons,
        duration_label: packageDuration,
        deliverables,
        terms: packageTerms,
      };

      if (editingPackage) {
        await PackageService.updatePackage(editingPackage.id, packageData);
      } else {
        await PackageService.createPackage(packageData);
      }
      
      // Refresh packages
      const updatedPackages = await PackageService.getVendorPackages(vendorId);
      setPackages(updatedPackages);
      
      setShowPackageModal(false);
      Alert.alert('Success', `Package ${editingPackage ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Error saving package:', error);
      Alert.alert('Error', 'Failed to save package');
    } finally {
      setPackagesLoading(false);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    Alert.alert(
      'Delete Package',
      'Are you sure you want to delete this package?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setPackagesLoading(true);
              await PackageService.deletePackage(packageId);
              
              // Refresh packages
              if (vendorId) {
                const updatedPackages = await PackageService.getVendorPackages(vendorId);
                setPackages(updatedPackages);
              }
              
              Alert.alert('Success', 'Package deleted successfully!');
            } catch (error) {
              console.error('Error deleting package:', error);
              Alert.alert('Error', 'Failed to delete package');
            } finally {
              setPackagesLoading(false);
            }
          }
        }
      ]
    );
  };

  // Extras management functions
  const handleAddExtra = () => {
    setPackageExtras(prev => [...prev, { name: '', available_qty: undefined, price_per_unit: undefined }]);
  };

  const handleUpdateExtra = (index: number, field: 'name' | 'available_qty' | 'price_per_unit', value: string | number | undefined) => {
    setPackageExtras(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveExtra = (index: number) => {
    setPackageExtras(prev => prev.filter((_, i) => i !== index));
  };

  // Load bookings for the current month
  const loadBookings = async () => {
    if (!vendorId) return;
    
    try {
      const allBookings = await BookingService.getVendorBookings(vendorId);
      
      // Bucket by date for the current month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startIso = new Date(year, month, 1).toISOString().slice(0, 10);
      const endIso = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      
      const bucket: Record<string, BookingWithDetails[]> = {};
      for (const booking of allBookings) {
        const dateIso = (booking as any).event_date as string;
        if (!dateIso) continue;
        if (dateIso >= startIso && dateIso <= endIso) {
          if (!bucket[dateIso]) bucket[dateIso] = [];
          bucket[dateIso].push(booking);
        }
      }
      setBookingsByDate(bucket);
      console.log('✅ Availability: Bookings loaded for month', year, month + 1);
    } catch (error) {
      console.error('Failed to load bookings:', error);
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
    
    // Create cells array with proper spacing
    const cells: { iso: string | null; status?: 'available' | 'blocked' | 'dayoff' | 'selected'; hasBookings?: boolean }[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      cells.push({ iso: null });
    }
    
    // Add cells for each day of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = format(year, month, d);
      const date = new Date(year, month, d);
      const blocked = blockedDates.some(b => b.date === iso);
      const dayoff = isDayOff(date);
      const selected = selectedDates.includes(iso);
      const hasBookings = (bookingsByDate[iso] || []).length > 0;
      
      let status: 'available' | 'blocked' | 'dayoff' | 'selected' = 'available';
      if (selected) {
        status = 'selected';
      } else if (blocked) {
        status = 'blocked';
      } else if (dayoff) {
        status = 'dayoff';
      }
      
      cells.push({ iso, status, hasBookings });
    }
    
    // Debug: Log calendar info
    console.log('Calendar Debug:', {
      year,
      month: month + 1,
      daysInMonth,
      firstDay,
      totalCells: cells.length,
      expectedRows: Math.ceil(cells.length / 7)
    });
    
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
            const isClickable = !!cell.iso && cell.status !== 'dayoff';
            
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => isClickable && handleToggleDate(cell.iso!)}
                style={[
                  styles.calendarDay,
                  !cell.iso && styles.calendarDayEmpty,
                  cell.status === 'selected' && styles.calendarDaySelected,
                  cell.status === 'blocked' && styles.calendarDayBlocked,
                  cell.status === 'dayoff' && styles.calendarDayOff,
                  cell.status === 'available' && styles.calendarDayAvailable,
                ]}
                disabled={!isClickable}
              >
                <Text style={[
                  styles.calendarDayText,
                  cell.status === 'selected' && styles.calendarDayTextSelected,
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
          <Text style={styles.loadingText}>Loading availability...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Availability & Packages</Text>
              <Text style={styles.subtitle}>Manage your services and schedule</Text>
            </View>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Modern Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'packages' && styles.activeTab]}
            onPress={() => setActiveTab('packages')}
          >
            <View style={[styles.tabIcon, activeTab === 'packages' && styles.activeTabIcon]}>
              <Package size={18} color={activeTab === 'packages' ? '#ffffff' : '#6b7280'} />
            </View>
            <Text style={[styles.tabText, activeTab === 'packages' && styles.activeTabText]}>
              Packages
            </Text>
            <View style={[styles.tabBadge, activeTab === 'packages' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === 'packages' && styles.activeTabBadgeText]}>
                {packages.length}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'availability' && styles.activeTab]}
            onPress={() => setActiveTab('availability')}
          >
            <View style={[styles.tabIcon, activeTab === 'availability' && styles.activeTabIcon]}>
              <Calendar size={18} color={activeTab === 'availability' ? '#ffffff' : '#6b7280'} />
            </View>
            <Text style={[styles.tabText, activeTab === 'availability' && styles.activeTabText]}>
              Availability
            </Text>
            <View style={[styles.tabBadge, activeTab === 'availability' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === 'availability' && styles.activeTabBadgeText]}>
                {blockedDates.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'packages' && (
            <View style={styles.packagesSection}>
              {/* Packages Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Packages</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleCreatePackage}>
                  <Plus size={16} color="white" />
                  <Text style={styles.addButtonText}>Add Package</Text>
                </TouchableOpacity>
              </View>

              {/* Packages List */}
              {packagesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#be185d" />
                  <Text style={styles.loadingText}>Loading packages...</Text>
                </View>
              ) : packages.length > 0 ? (
                <View style={styles.packagesList}>
                  {packages.map((pkg) => (
                    <View key={pkg.id} style={styles.packageItem}>
                      <View style={styles.packageHeader}>
                        <Text style={styles.packageTitle}>{pkg.title}</Text>
                        <View style={styles.packageActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleEditPackage(pkg)}
                          >
                            <Edit3 size={16} color="#6b7280" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeletePackage(pkg.id)}
                          >
                            <Trash2 size={16} color="#dc2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.packagePrice}>
                        {pkg.pricing_type === 'per_person' 
                          ? `₹${pkg.price_per_person}/person`
                          : `₹${pkg.price?.toLocaleString()}`
                        }
                      </Text>
                      {pkg.duration_label && (
                        <Text style={styles.packageDuration}>{pkg.duration_label}</Text>
                      )}
                      {pkg.deliverables && pkg.deliverables.length > 0 && (
                        <View style={styles.packageDeliverables}>
                          <Text style={styles.deliverablesLabel}>Deliverables:</Text>
                          <Text style={styles.deliverablesText}>{pkg.deliverables.join(', ')}</Text>
                        </View>
                      )}
                      {pkg.package_extras && pkg.package_extras.length > 0 && (
                        <View style={styles.packageExtras}>
                          <Text style={styles.extrasLabel}>Extras:</Text>
                          {pkg.package_extras.map((extra: any, index: number) => (
                            <View key={index} style={styles.extraItem}>
                              <Text style={styles.extraText}>
                                {extra.name} 
                                {extra.price_per_unit && ` - ₹${extra.price_per_unit}`}
                                {extra.available_qty && ` (${extra.available_qty} available)`}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Package size={48} color="#9ca3af" />
                  <Text style={styles.emptyStateText}>No packages yet</Text>
                  <Text style={styles.emptyStateSubtext}>Create your first package to get started</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'availability' && (
            <View style={styles.availabilitySection}>
                  {/* Calendar */}
                  <View style={styles.calendarSection}>
                    {renderCalendar()}
                  </View>


                  {/* Selected Dates */}
              {selectedDates.length > 0 && (
                <View style={styles.selectedDatesSection}>
                  <Text style={styles.sectionTitle}>Selected Dates ({selectedDates.length})</Text>
                  <View style={styles.selectedDatesList}>
                    {selectedDates.map(date => (
                      <View key={date} style={styles.selectedDateBadge}>
                        <Text style={styles.selectedDateText}>{date}</Text>
                        <TouchableOpacity
                          onPress={() => setSelectedDates(prev => prev.filter(d => d !== date))}
                          style={styles.removeDateButton}
                        >
                          <X size={12} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.blockButton} onPress={handleBlockDates}>
                    <Text style={styles.blockButtonText}>Block Selected Dates</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Blocked Dates */}
              <View style={styles.blockedDatesSection}>
                <Text style={styles.sectionTitle}>Blocked Dates</Text>
                {blockedDates.length > 0 ? (
                  <View style={styles.blockedDatesList}>
                    {blockedDates.map((blocked) => (
                      <View key={blocked.date} style={styles.blockedDateItem}>
                        <View style={styles.blockedDateInfo}>
                          <Text style={styles.blockedDateText}>{blocked.date}</Text>
                          {blocked.reason && (
                            <Text style={styles.blockedDateReason}>{blocked.reason}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleUnblockDate(blocked.date)}
                          style={styles.unblockButton}
                        >
                          <Text style={styles.unblockButtonText}>Unblock</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Calendar size={48} color="#9ca3af" />
                    <Text style={styles.emptyStateText}>No blocked dates</Text>
                    <Text style={styles.emptyStateSubtext}>Select dates above to block them</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Package Modal */}
      <Modal visible={showPackageModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPackage ? 'Edit Package' : 'Create Package'}
            </Text>
            <TouchableOpacity onPress={() => setShowPackageModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Package Title</Text>
              <TextInput
                style={styles.input}
                value={packageTitle}
                onChangeText={setPackageTitle}
                placeholder="Enter package title"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pricing Type</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioButton, packagePricingType === 'fixed' && styles.radioButtonSelected]}
                  onPress={() => setPackagePricingType('fixed')}
                >
                  <Text style={[styles.radioText, packagePricingType === 'fixed' && styles.radioTextSelected]}>
                    Fixed Price
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioButton, packagePricingType === 'per_person' && styles.radioButtonSelected]}
                  onPress={() => setPackagePricingType('per_person')}
                >
                  <Text style={[styles.radioText, packagePricingType === 'per_person' && styles.radioTextSelected]}>
                    Per Person
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {packagePricingType === 'fixed' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={packagePrice.toString()}
                  onChangeText={(text) => setPackagePrice(Number(text) || 0)}
                  placeholder="Enter price"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price Per Person (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={packagePricePerPerson.toString()}
                    onChangeText={(text) => setPackagePricePerPerson(Number(text) || 0)}
                    placeholder="Enter price per person"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Minimum Persons</Text>
                  <TextInput
                    style={styles.input}
                    value={packageMinPersons?.toString() || ''}
                    onChangeText={(text) => setPackageMinPersons(Number(text) || undefined)}
                    placeholder="Enter minimum persons"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration</Text>
              <TextInput
                style={styles.input}
                value={packageDuration}
                onChangeText={setPackageDuration}
                placeholder="e.g., 2 hours, Full day"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Deliverables (comma-separated)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={packageDeliverables}
                onChangeText={setPackageDeliverables}
                placeholder="e.g., Photography, Editing, Prints"
                multiline
                numberOfLines={3}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Extras Section */}
            <View style={styles.inputGroup}>
              <View style={styles.extrasHeader}>
                <Text style={styles.inputLabel}>Extras</Text>
                <TouchableOpacity style={styles.addExtraButton} onPress={handleAddExtra}>
                  <Plus size={12} color="#be185d" />
                  <Text style={styles.addExtraButtonText}>Add Extra</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.extrasList}>
                {packageExtras.map((extra, index) => (
                  <View key={index} style={styles.extraRow}>
                    <View style={styles.extraInputGroup}>
                      <Text style={styles.extraLabel}>Name</Text>
                      <TextInput
                        style={styles.extraInput}
                        value={extra.name}
                        onChangeText={(text) => handleUpdateExtra(index, 'name', text)}
                        placeholder="Extra name"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.extraInputGroup}>
                      <Text style={styles.extraLabel}>Available Qty</Text>
                      <TextInput
                        style={styles.extraInput}
                        value={extra.available_qty?.toString() || ''}
                        onChangeText={(text) => handleUpdateExtra(index, 'available_qty', text ? Number(text) : undefined)}
                        placeholder="Qty"
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.extraInputGroup}>
                      <Text style={styles.extraLabel}>Price per Unit</Text>
                      <TextInput
                        style={styles.extraInput}
                        value={extra.price_per_unit?.toString() || ''}
                        onChangeText={(text) => handleUpdateExtra(index, 'price_per_unit', text ? Number(text) : undefined)}
                        placeholder="₹0"
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.removeExtraButton}
                      onPress={() => handleRemoveExtra(index)}
                    >
                      <X size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Terms & Conditions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={packageTerms}
                onChangeText={setPackageTerms}
                placeholder="Enter terms and conditions"
                multiline
                numberOfLines={4}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPackageModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, packagesLoading && styles.saveButtonDisabled]}
              onPress={handleSavePackage}
              disabled={packagesLoading}
            >
              <Text style={styles.saveButtonText}>
                {packagesLoading ? 'Saving...' : (editingPackage ? 'Update' : 'Create')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingVertical: 8, // Small padding below header
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  
  // Mobile-Friendly Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#be185d',
    borderColor: '#be185d',
  },
  tabIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabIcon: {
    // No special styling needed
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  tabBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 16,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabBadgeText: {
    color: 'white',
  },
  
  // Packages Section
  packagesSection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#be185d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  packagesList: {
    gap: 12,
  },
  packageItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  packageTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  packageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  packageStatusBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  packageStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
  },
  packageContent: {
    gap: 8,
  },
  packagePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#be185d',
  },
  packageDuration: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  packageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#be185d',
    marginBottom: 4,
  },
  packageDuration: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  packageDeliverables: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
  },
  deliverablesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 3,
  },
  deliverablesText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  packageExtras: {
    backgroundColor: '#fefce8',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#f59e0b',
  },
  extrasLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 4,
  },
  extraItem: {
    marginBottom: 2,
  },
  extraText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  
  // Availability Section
  availabilitySection: {
    gap: 16,
  },
  // Sleek Glassy Calendar
  calendarSection: {
    marginBottom: 16,
  },
  calendarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(190, 24, 93, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(190, 24, 93, 0.2)',
  },
  calendarNavText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#be185d',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    paddingVertical: 4,
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
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  calendarDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  calendarDayTextSelected: {
    color: '#be185d',
    fontWeight: '700',
  },
  calendarDayTextBlocked: {
    color: '#ef4444',
    fontWeight: '600',
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
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingsSection: {
    marginBottom: 24,
  },
  bookingsList: {
    gap: 12,
  },
  bookingItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingDate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  bookingCountText: {
    fontSize: 12,
    color: '#6b7280',
  },
  bookingDetails: {
    gap: 4,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingCustomerText: {
    fontSize: 13,
    color: '#374151',
  },
  bookingStatusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedDatesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  selectedDateText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  removeDateButton: {
    padding: 2,
  },
  blockButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  blockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  blockedDatesSection: {
    marginBottom: 24,
  },
  blockedDatesList: {
    gap: 8,
  },
  blockedDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  blockedDateInfo: {
    flex: 1,
  },
  blockedDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  blockedDateReason: {
    fontSize: 12,
    color: '#6b7280',
  },
  unblockButton: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  unblockButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#be185d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#be185d',
    borderColor: '#be185d',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  radioTextSelected: {
    color: 'white',
  },
  
  // Extras Modal Styles
  extrasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addExtraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fce7f3',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  addExtraButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#be185d',
  },
  extrasList: {
    gap: 8,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  extraInputGroup: {
    flex: 1,
  },
  extraLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  extraInput: {
    backgroundColor: 'white',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  removeExtraButton: {
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#be185d',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
});
