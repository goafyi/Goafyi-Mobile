import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Inbox, Users, Package, CalendarCheck2, Settings, LogOut, Home, TrendingUp, Clock } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { RequestService } from '../services/requestService';
import { PackageService } from '../services/packageService';
import { AvailabilityService } from '../services/availabilityService';
import { AuthService } from '../services/authService';
import { VendorService } from '../services/vendorService';
import { Button } from '../components/ui';

interface VendorDashboardScreenProps {
  navigation?: any;
}

export default function VendorDashboardScreen({ navigation }: VendorDashboardScreenProps) {
  const { user } = useSupabase();
  const insets = useSafeAreaInsets();
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  
  console.log('VendorDashboardScreen: user data:', user);

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
      navigation?.navigate('auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  const [dashboardData, setDashboardData] = useState({
    requests: 0,
    upcomingBookings: 0,
    packages: 0,
    capacity: 0,
    bookedDates: [] as string[],
    profileImage: '',
    email: '',
    customers: 0,
    reviews: 0,
    weeklyBookings: [0, 0, 0, 0, 0, 0, 0], // Monday to Sunday
    monthlyAvailability: 0, // Days booked this month
    monthlyBookings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Jan to Dec
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  // Chart data for different time periods
  const chartData = {
    week: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [15, 20, 10, 22, 17, 25, 7],
      maxValue: 25
    },
    month: {
      labels: ['Wk1', 'Wk2', 'Wk3', 'Wk4'],
      values: [70, 85, 60, 95],
      maxValue: 100
    },
    year: {
      labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      values: [60, 75, 85, 70, 90, 80],
      maxValue: 100
    }
  };

  // Function to calculate bar height percentage
  const getBarHeight = (value: number, maxValue: number) => {
    return (value / maxValue) * 100;
  };
  

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        console.log('Dashboard: No user ID, skipping load');
        return;
      }
      
      console.log('Dashboard: Starting load with user:', user);
      try {
        setDashboardLoading(true);
        
        // Get vendor ID and business name
        const vendorIdResult = await AuthService.getVendorId(user.id);
        console.log('Dashboard: Got vendorId:', vendorIdResult);
        
        if (!vendorIdResult) {
          console.log('Dashboard: No vendor ID found for user:', user.id);
          console.log('Dashboard: User role:', user.role);
          // If user is not a vendor, show a message or redirect
          if (user.role !== 'vendor') {
            console.log('Dashboard: User is not a vendor, skipping dashboard');
            return;
          }
        }
        
        setVendorId(vendorIdResult);
        
        if (vendorIdResult) {
          // Get vendor data for business name
          const vendorData = await VendorService.getVendorByUserId(user.id);
          console.log('Dashboard: Got vendor data:', vendorData);
          if (vendorData) {
            setBusinessName(vendorData.business_name || user.full_name || 'Vendor');
            
            // Update dashboard data with vendor info
            setDashboardData(prev => ({
              ...prev,
              profileImage: '',
              email: user.email || '',
              customers: 0,
              reviews: 0
            }));
            console.log('Dashboard: Updated vendor data');
            console.log('Dashboard: User avatar URL:', user?.avatar_url);
          }
        }
        
      } catch (error) {
        console.error('Error loading vendor data:', error);
      } finally {
        setDashboardLoading(false);
      }
    };
    load();
  }, [user?.id, user?.full_name]);

  const loadDashboardData = async (showLoading = true) => {
    if (!vendorId) return;
    
    if (showLoading) setDashboardLoading(true);
    try {
      // Load all data in parallel for faster loading (same as Next.js)
      const [requests, packages, availabilitySettings] = await Promise.all([
        RequestService.listVendorRequests(vendorId),
        PackageService.getVendorPackages(vendorId),
        AvailabilityService.getSettings(vendorId)
      ]);

      const pendingRequests = requests.filter(r => r.status === 'pending').length;
      const upcomingBookings = requests.filter(r => r.status === 'confirmed').length;
      const capacity = availabilitySettings?.slots_per_day || 0;
      
      // Get booked dates from confirmed requests (same as Next.js)
      const bookedDates = requests
        .filter(r => r.status === 'confirmed')
        .flatMap(r => r.dates?.map((d: any) => d.event_date) || [])
        .filter((date, index, arr) => arr.indexOf(date) === index); // Remove duplicates


      const newData = {
        requests: pendingRequests,
        upcomingBookings,
        packages: packages.length,
        capacity,
        bookedDates,
        profileImage: '',
        email: user?.email || '',
        customers: 0,
        reviews: 0,
        weeklyBookings: [0, 0, 0, 0, 0, 0, 0],
        monthlyAvailability: 0,
        monthlyBookings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      };

      setDashboardData(newData);
      if (showLoading) {
        console.log('✅ Dashboard: Initial data loaded', newData);
        console.log('✅ Dashboard: Requests:', requests.length, 'Pending:', pendingRequests);
        console.log('✅ Dashboard: Packages:', packages.length, 'Capacity:', capacity);
        console.log('✅ Dashboard: Booked dates:', bookedDates);
      } else {
        console.log('✅ Dashboard: Data updated in real-time', newData);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      if (showLoading) setDashboardLoading(false);
    }
  };

  // Initial load of dashboard data
  useEffect(() => {
    console.log('Dashboard: vendorId changed, loading data:', vendorId);
    if (vendorId) {
      loadDashboardData();
    }
  }, [vendorId]);

  if (dashboardLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  // If user is not a vendor or no vendor ID, show message
  if (!vendorId && user?.role !== 'vendor') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Welcome!</Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#6b7280' }}>{user?.full_name || 'User'}</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>This dashboard is for vendors only.</Text>
            <Text style={styles.errorSubtext}>Please contact support if you believe this is an error.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Rose Header Section with Marbled Gradient */}
        <View style={styles.roseHeader}>
          {/* Gradient Overlay Layers */}
          <View style={styles.gradientLayer1} />
          <View style={styles.gradientLayer2} />
          <View style={styles.gradientLayer3} />
          
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.homeButton} onPress={() => navigation?.navigate('home')}>
              <Home size={20} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerContent}>
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                      {(dashboardData.profileImage || user?.avatar_url) ? (
                        <Image 
                          source={{ uri: (dashboardData.profileImage || user?.avatar_url) as string }} 
                          style={styles.profileImage}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log('Profile image load error:', error);
                          }}
                          onLoad={() => {
                            console.log('Profile image loaded successfully');
                          }}
                        />
                      ) : (
                  <View style={styles.profileImage}>
                    <Text style={styles.profileInitials}>
                      {(businessName || 'Vendor').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.profileInfo}>
                <View style={styles.businessNameContainer}>
                  <Text style={styles.businessName}>{businessName || 'Business Name'}</Text>
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>New</Text>
                  </View>
                </View>
                <Text style={styles.businessEmail}>{dashboardData.email || 'vendor@business.com'}</Text>
            </View>
            </View>
          </View>
        </View>

        {/* Stats Cards Grid */}
          <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
               <View style={[styles.statCard, styles.statCardRose]}>
                 <View style={styles.statIcon}>
                   <Inbox size={24} color="#10b981" />
                 </View>
              <Text style={styles.statNumber}>
                  {dashboardLoading ? '...' : dashboardData.requests}
                </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

               <View style={[styles.statCard, styles.statCardRoseDark]}>
                 <View style={styles.statIcon}>
                   <CalendarCheck2 size={24} color="#059669" />
                 </View>
              <Text style={styles.statNumber}>
                  {dashboardLoading ? '...' : dashboardData.upcomingBookings}
                </Text>
              <Text style={styles.statLabel}>Confirmed</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>New</Text>
              </View>
              </View>
            </View>

          <View style={styles.statsRow}>
               <View style={[styles.statCard, styles.statCardRoseLight]}>
                 <View style={styles.statIcon}>
                   <Package size={24} color="#047857" />
                 </View>
              <Text style={styles.statNumber}>
                  {dashboardLoading ? '...' : dashboardData.packages}
                </Text>
              <Text style={styles.statLabel}>Packages</Text>
            </View>

               <View style={[styles.statCard, styles.statCardRoseAccent]}>
                 <View style={styles.statIcon}>
                   <Users size={24} color="#065f46" />
                 </View>
              <Text style={styles.statNumber}>
                  {dashboardLoading ? '...' : dashboardData.capacity}
                </Text>
              <Text style={styles.statLabel}>Capacity</Text>
            </View>
          </View>
        </View>

        {/* Booking Trends Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Booking Trends</Text>
          
          {/* Time Period Selector */}
          <View style={styles.timeSelector}>
            <TouchableOpacity 
              style={[styles.timeButton, styles.timeButtonActive]}
              onPress={() => setSelectedPeriod('week')}
            >
              <Text style={[styles.timeButtonText, styles.timeButtonTextActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setSelectedPeriod('month')}
            >
              <Text style={styles.timeButtonText}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setSelectedPeriod('year')}
            >
              <Text style={styles.timeButtonText}>Year</Text>
            </TouchableOpacity>
          </View>

          {/* Chart Container */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Bookings Over Time</Text>
              <Text style={styles.chartSubtitle}>
                {selectedPeriod === 'week' ? 'Last 7 Days' : 
                 selectedPeriod === 'month' ? 'Last 30 Days' : 'Last 12 Months'}
              </Text>
            </View>
            
            {/* Bar Chart Representation */}
            <View style={styles.chartArea}>
              <View style={styles.chartGrid}>
                {/* Y-axis labels */}
                <View style={styles.yAxis}>
                  <Text style={styles.yAxisLabel}>{chartData[selectedPeriod].maxValue}</Text>
                  <Text style={styles.yAxisLabel}>{Math.round(chartData[selectedPeriod].maxValue * 0.8)}</Text>
                  <Text style={styles.yAxisLabel}>{Math.round(chartData[selectedPeriod].maxValue * 0.6)}</Text>
                  <Text style={styles.yAxisLabel}>{Math.round(chartData[selectedPeriod].maxValue * 0.4)}</Text>
                  <Text style={styles.yAxisLabel}>{Math.round(chartData[selectedPeriod].maxValue * 0.2)}</Text>
                  <Text style={styles.yAxisLabel}>0</Text>
                </View>
                
                {/* Chart area */}
                <View style={styles.chartContent}>
                  {/* Grid lines */}
                  <View style={styles.gridContainer}>
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                  </View>
                  
                  {/* Bar chart */}
                  <View style={styles.barsRow}>
                    {chartData[selectedPeriod].values.map((value, index) => {
                      const heightPercentage = getBarHeight(value, chartData[selectedPeriod].maxValue);
                      
                      return (
                        <View key={index} style={styles.barWrapper}>
                          <View 
                            style={[
                              styles.bar, 
                              { height: `${heightPercentage}%` }
                            ]} 
                          />
                        </View>
                      );
                    })}
                  </View>
                  
                  {/* X-axis labels */}
                  <View style={styles.labelsRow}>
                    {chartData[selectedPeriod].labels.map((label, index) => (
                      <Text key={index} style={styles.xAxisLabel}>
                        {label}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            
            {/* Chart Stats */}
            <View style={styles.chartStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {chartData[selectedPeriod].values.reduce((sum, value) => sum + value, 0)}
                </Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {selectedPeriod === 'week' ? '+15%' : 
                   selectedPeriod === 'month' ? '+22%' : '+18%'}
                </Text>
                <Text style={styles.statLabel}>vs Last Period</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.quickActionCard, styles.quickActionCardTopLeft]}
              onPress={() => navigation?.navigate('account/bookings')}
            >
              <View style={styles.quickActionIcon}>
                 <Inbox size={20} color="#10b981" />
              </View>
              <Text style={styles.quickActionTitle}>Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionCard, styles.quickActionCardTopRight]}
              onPress={() => navigation?.navigate('account/availability')}
            >
              <View style={styles.quickActionIcon}>
                 <Calendar size={20} color="#10b981" />
              </View>
              <Text style={styles.quickActionTitle}>Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionCard, styles.quickActionCardBottomLeft]}
              onPress={() => navigation?.navigate('account')}
            >
              <View style={styles.quickActionIcon}>
                 <Users size={20} color="#10b981" />
              </View>
              <Text style={styles.quickActionTitle}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionCard, styles.quickActionCardBottomRight]}
              onPress={() => navigation?.navigate('account/availability')}
            >
              <View style={styles.quickActionIcon}>
                 <Package size={20} color="#10b981" />
              </View>
              <Text style={styles.quickActionTitle}>Services</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf2f8',
  },
  content: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  roseHeader: {
    backgroundColor: '#10b981',
    paddingTop: 45,
    paddingBottom: 48,
    paddingHorizontal: 24,
    position: 'relative',
  },
  gradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#059669',
    opacity: 0.3,
    borderRadius: 0,
  },
  gradientLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#047857',
    opacity: 0.2,
    borderRadius: 0,
  },
  gradientLayer3: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#065f46',
    opacity: 0.15,
    borderRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  profileSection: {
    alignItems: 'center',
    width: '100%',
  },
  profileImageContainer: {
    marginBottom: 6,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
    transform: [{ translateY: -4 }, { scale: 1.05 }],
    borderWidth: 0,
  },
  profileInitials: {
    fontSize: 44,
    fontWeight: '700',
    color: '#10b981',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  businessNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
  },
  headerBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  businessEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
    textAlign: 'center',
  },
  statsGrid: {
    paddingHorizontal: 16,
    marginTop: -36,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
    position: 'relative',
    borderWidth: 0,
    minHeight: 110,
  },
  statCardRose: {
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.30,
    shadowRadius: 32,
    elevation: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  statCardRoseDark: {
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.30,
    shadowRadius: 32,
    elevation: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  statCardRoseLight: {
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.30,
    shadowRadius: 32,
    elevation: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  statCardRoseAccent: {
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#065f46',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.30,
    shadowRadius: 32,
    elevation: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
  },
  statIcon: {
    marginBottom: 8,
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 6,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'none',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  chartSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  timeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: '#10b981',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  timeButtonTextActive: {
    color: '#ffffff',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  chartArea: {
    height: 200,
    marginBottom: 16,
  },
  chartGrid: {
    flex: 1,
    flexDirection: 'row',
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  chartContent: {
    flex: 1,
    position: 'relative',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#e5e7eb',
    width: '100%',
  },
  barsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 20,
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  labelsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  xAxisLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    flex: 1,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  quickActionsSection: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    padding: 12,
    marginBottom: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  quickActionCardTopLeft: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  quickActionCardTopRight: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  quickActionCardBottomLeft: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 0,
  },
  quickActionCardBottomRight: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 16,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});
