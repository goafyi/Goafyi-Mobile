import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Plus, X, Clock, Package, Edit3, Trash2 } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { AvailabilityService, type AvailabilitySettingsRecord, type BlockedDateRecord } from '../services/availabilityService';
import { PackageService, type PackageRecord } from '../services/packageService';
import { BookingService, type BookingWithDetails } from '../services/bookingService';
import { AuthService } from '../services/authService';
import { VendorService, supabase } from '../services/vendorService';

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
  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  
  // Load availability enabled state from database
  useEffect(() => {
    const loadAvailabilityState = async () => {
      if (!vendorId) return;
      
      try {
        const vendor = await VendorService.getVendorByUserIdCachedFirst(vendorId);
        if (vendor) {
          setAvailabilityEnabled(vendor.availability_enabled ?? true);
        }
      } catch (error) {
        console.error('Error loading availability state:', error);
      }
    };
    
    loadAvailabilityState();
  }, [vendorId]);
  
  // Save availability toggle state to database
  const handleAvailabilityToggle = async (enabled: boolean) => {
    if (!vendorId) {
      console.error('No vendorId available for availability toggle');
      Alert.alert('Error', 'Vendor ID not found. Please try again.');
      return;
    }
    
    setSavingAvailability(true);
    try {
      console.log('Updating availability for vendor:', vendorId, 'to:', enabled);
      
      // Try updating via VendorService first
      try {
        await VendorService.updateVendor(vendorId, { availability_enabled: enabled });
        console.log('Availability updated via VendorService');
      } catch (vendorError) {
        console.error('VendorService update failed:', vendorError);
        
        // Fallback: Try direct Supabase update
        console.log('Trying direct Supabase update...');
        const { error: supabaseError } = await supabase
          .from('vendors')
          .update({ availability_enabled: enabled })
          .eq('id', vendorId);
          
        if (supabaseError) {
          throw supabaseError;
        }
        console.log('Availability updated via direct Supabase');
      }
      
      setAvailabilityEnabled(enabled);
      console.log('Availability updated successfully');
    } catch (error) {
      console.error('Error updating availability state:', error);
      Alert.alert('Error', `Failed to update availability setting: ${error.message || 'Unknown error'}`);
    } finally {
      setSavingAvailability(false);
    }
  };
  
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
      if (!user?.id) {
        console.error('No user ID available');
        return;
      }
      
      try {
        setLoading(true);
        
        // Get vendor ID
        console.log('Getting vendor ID for user:', user.id);
        const vendorIdResult = await AuthService.getVendorId(user.id);
        console.log('Vendor ID result:', vendorIdResult);
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
            } else {
              console.error('No vendor ID found for user:', user.id);
              Alert.alert('Error', 'Vendor profile not found. Please contact support.');
            }
            
          } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', `Failed to load data: ${error.message || 'Unknown error'}`);
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

    if (!vendorId) {
      console.error('No vendorId available for blocking dates');
      Alert.alert('Error', 'Vendor ID not found. Please try again.');
      return;
    }

    // Filter out dates that are already blocked
    const alreadyBlockedDates = selectedDates.filter(date => 
      blockedDates.some(blocked => blocked.date === date)
    );
    
    const newDatesToBlock = selectedDates.filter(date => 
      !blockedDates.some(blocked => blocked.date === date)
    );

    if (newDatesToBlock.length === 0) {
      Alert.alert('Already Blocked', 'All selected dates are already blocked');
      return;
    }

    if (alreadyBlockedDates.length > 0) {
      Alert.alert(
        'Some Dates Already Blocked', 
        `${alreadyBlockedDates.length} date(s) are already blocked. Blocking ${newDatesToBlock.length} new date(s).`
      );
    }

    try {
      console.log('Blocking dates for vendor:', vendorId, 'dates:', newDatesToBlock);
      await AvailabilityService.addBlockedDates(vendorId, newDatesToBlock, 'Blocked by vendor');
      
      setBlockedDates(prev => [
        ...prev,
        ...newDatesToBlock.map(date => ({
          id: '',
          vendor_id: vendorId,
          date,
          reason: 'Blocked by vendor',
          created_at: new Date().toISOString()
        }))
      ]);
      setSelectedDates([]);
      console.log('Dates blocked successfully');
      Alert.alert('Success', `${newDatesToBlock.length} date(s) blocked successfully`);
    } catch (error) {
      console.error('Error blocking dates:', error);
      Alert.alert('Error', `Failed to block dates: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUnblockDate = async (date: string) => {
    if (!vendorId) {
      console.error('No vendorId available for unblocking date');
      Alert.alert('Error', 'Vendor ID not found. Please try again.');
      return;
    }

    try {
      console.log('Unblocking date for vendor:', vendorId, 'date:', date);
      await AvailabilityService.removeBlockedDates(vendorId, [date]);
      setBlockedDates(prev => prev.filter(b => b.date !== date));
      console.log('Date unblocked successfully');
      Alert.alert('Success', 'Date unblocked successfully');
    } catch (error) {
      console.error('Error unblocking date:', error);
      Alert.alert('Error', `Failed to unblock date: ${error.message || 'Unknown error'}`);
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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading availability...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Manage Services</Text>
            <Text style={styles.headerSubtitle}>Packages & Availability</Text>
          </View>
        </View>
      </View>

      {/* Overlapping Menu Buttons */}
      <View style={styles.overlappingMenuContainer}>
        <View style={styles.menuButtons}>
          <TouchableOpacity
            style={[styles.menuButton, activeTab === 'packages' && styles.activeMenuButton]}
            onPress={() => setActiveTab('packages')}
          >
            <Text style={[styles.menuButtonText, activeTab === 'packages' && styles.activeMenuButtonText]}>
              Packages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, activeTab === 'availability' && styles.activeMenuButton]}
            onPress={() => setActiveTab('availability')}
          >
            <Text style={[styles.menuButtonText, activeTab === 'availability' && styles.activeMenuButtonText]}>
              Availability
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>

        {/* Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'packages' && (
            <View style={styles.packagesSection}>
              {/* Compact Header */}
              <View style={styles.compactHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.compactTitle}>Packages</Text>
                  <Text style={styles.compactSubtitle}>{packages.length} active</Text>
                </View>
                <TouchableOpacity style={styles.compactAddButton} onPress={handleCreatePackage}>
                  <Plus size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Modern Packages Grid */}
              {packagesLoading ? (
                <View style={styles.modernLoadingContainer}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={styles.modernLoadingText}>Loading packages...</Text>
                </View>
              ) : packages.length > 0 ? (
                <View style={styles.simplePackagesGrid}>
                  {packages.map((pkg) => (
                    <View key={pkg.id} style={styles.simplePackageCard}>
                      <View style={styles.simpleCardContent}>
                        <View style={styles.simpleIconContainer}>
                          <Package size={20} color="#10b981" />
                        </View>
                        <View style={styles.simpleTextInfo}>
                          <Text style={styles.simplePackageTitle}>{pkg.title}</Text>
                          <Text style={styles.simplePackagePrice}>
                            {pkg.pricing_type === 'per_person' 
                              ? `₹${pkg.price_per_person}/person`
                              : `₹${pkg.price?.toLocaleString()}`
                            }
                          </Text>
                        </View>
                        <View style={styles.simpleActions}>
                          <TouchableOpacity
                            style={styles.simpleActionButton}
                            onPress={() => handleEditPackage(pkg)}
                          >
                            <Edit3 size={16} color="#6b7280" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.simpleActionButton}
                            onPress={() => handleDeletePackage(pkg.id)}
                          >
                            <Trash2 size={16} color="#dc2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.modernEmptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Package size={64} color="#10b981" />
                  </View>
                  <Text style={styles.modernEmptyTitle}>No Packages Yet</Text>
                  <Text style={styles.modernEmptySubtitle}>
                    Create your first service package to start accepting bookings
                  </Text>
                  <TouchableOpacity style={styles.modernEmptyButton} onPress={handleCreatePackage}>
                    <Plus size={20} color="#ffffff" />
                    <Text style={styles.modernEmptyButtonText}>Create Package</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === 'availability' && (
            <View style={styles.availabilitySection}>
              {/* Availability Toggle */}
              <View style={styles.availabilityToggleSection}>
                <View style={styles.toggleContainer}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleTitle}>Enable Availability for Viewers</Text>
                    <Text style={styles.toggleSubtitle}>
                      When enabled, viewers can see your availability and book services
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, availabilityEnabled && styles.toggleSwitchActive]}
                    onPress={() => handleAvailabilityToggle(!availabilityEnabled)}
                    disabled={savingAvailability}
                  >
                    <View style={[styles.toggleThumb, availabilityEnabled && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
              </View>

              {availabilityEnabled ? (
                <>
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
                </>
              ) : (
                <View style={styles.availabilityDisabledSection}>
                  <Calendar size={64} color="#9ca3af" />
                  <Text style={styles.disabledTitle}>Availability Disabled</Text>
                  <Text style={styles.disabledSubtitle}>
                    Viewers cannot see your availability or book services when disabled
                  </Text>
                  <Text style={styles.disabledNote}>
                    Toggle the switch above to enable availability for viewers
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modern Package Modal */}
      <Modal visible={showPackageModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modernModalContainer}>
          <View style={styles.modernModalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modernModalTitle}>
                {editingPackage ? 'Edit Package' : 'Create Package'}
              </Text>
              <Text style={styles.modernModalSubtitle}>
                {editingPackage ? 'Update your package details' : 'Add a new service package'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.modernCloseButton}
              onPress={() => setShowPackageModal(false)}
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modernModalContent}>
            <View style={styles.modernInputGroup}>
              <Text style={styles.modernInputLabel}>Package Title</Text>
              <TextInput
                style={styles.modernInput}
                value={packageTitle}
                onChangeText={setPackageTitle}
                placeholder="Enter package title"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.modernInputGroup}>
              <Text style={styles.modernInputLabel}>Pricing Type</Text>
              <View style={styles.modernRadioGroup}>
                <TouchableOpacity
                  style={[styles.modernRadioButton, packagePricingType === 'fixed' && styles.modernRadioButtonSelected]}
                  onPress={() => setPackagePricingType('fixed')}
                >
                  <Text style={[styles.modernRadioText, packagePricingType === 'fixed' && styles.modernRadioTextSelected]}>
                    Fixed Price
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modernRadioButton, packagePricingType === 'per_person' && styles.modernRadioButtonSelected]}
                  onPress={() => setPackagePricingType('per_person')}
                >
                  <Text style={[styles.modernRadioText, packagePricingType === 'per_person' && styles.modernRadioTextSelected]}>
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

          <View style={styles.modernModalActions}>
            <TouchableOpacity
              style={styles.modernCancelButton}
              onPress={() => setShowPackageModal(false)}
            >
              <Text style={styles.modernCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modernSaveButton, packagesLoading && styles.modernSaveButtonDisabled]}
              onPress={handleSavePackage}
              disabled={packagesLoading}
            >
              <Text style={styles.modernSaveButtonText}>
                {packagesLoading ? 'Saving...' : (editingPackage ? 'Update Package' : 'Create Package')}
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
    backgroundColor: '#ecfdf5',
  },
  header: {
    backgroundColor: '#10b981',
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  overlappingMenuContainer: {
    marginTop: -20,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  menuButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  menuButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  activeMenuButton: {
    backgroundColor: '#ffffff',
    borderWidth: 0,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  menuButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  activeMenuButtonText: {
    color: '#10b981',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  
  // Compact Professional Packages Section
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  compactSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  compactAddButton: {
    backgroundColor: '#10b981',
    borderRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modernLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modernLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  simplePackagesGrid: {
    gap: 12,
  },
  simplePackageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderTopLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 0,
  },
  simpleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  simpleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  simpleTextInfo: {
    flex: 1,
  },
  simplePackageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  simplePackagePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  simpleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  simpleActionButton: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  enhancedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  enhancedPackageInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  enhancedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancedTextInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  enhancedPackageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#10b981',
    borderRadius: 0,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enhancedPackagePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 0,
    borderTopLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  enhancedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  enhancedActionButton: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  enhancedCardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  enhancedInfoBadge: {
    backgroundColor: '#f8fafc',
    borderRadius: 0,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  enhancedInfoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  packageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modernActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardContent: {
    gap: 12,
  },
  modernPackageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  durationBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  deliverablesContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deliverablesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  deliverablesList: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  extrasContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  extrasTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  extrasPreview: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  modernEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modernEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernEmptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modernEmptyButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modernEmptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modern Form Styles
  modernModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modernModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderContent: {
    flex: 1,
  },
  modernModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  modernModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  modernCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modernModalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modernInputGroup: {
    marginBottom: 20,
  },
  modernInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modernInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modernRadioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  modernRadioButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modernRadioButtonSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  modernRadioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  modernRadioTextSelected: {
    color: '#ffffff',
  },
  modernModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modernCancelButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modernCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  modernSaveButton: {
    flex: 2,
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modernSaveButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  modernSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  
  
  // Packages Section
  packagesSection: {
    gap: 16,
    paddingBottom: 20,
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
  
  // Availability Toggle Section
  availabilityToggleSection: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  toggleSwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#10b981',
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  availabilityDisabledSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  disabledSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  disabledNote: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
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
    backgroundColor: 'rgba(240, 253, 244, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  calendarNavText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
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
    color: '#10b981',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
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
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  calendarDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  calendarDayTextSelected: {
    color: '#10b981',
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
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 0,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedDateText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  removeDateButton: {
    padding: 2,
  },
  blockButton: {
    backgroundColor: '#10b981',
    borderRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  blockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  blockedDatesSection: {
    marginBottom: 24,
    paddingBottom: 100, // Add padding to go above bottom navigation
  },
  blockedDatesList: {
    gap: 8,
  },
  blockedDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    borderRadius: 0,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
