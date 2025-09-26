import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Inbox, Users, TrendingUp, Clock, Package, CalendarCheck2 } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { RequestService } from '../services/requestService';
import { PackageService } from '../services/packageService';
import { AvailabilityService } from '../services/availabilityService';
import { AuthService } from '../services/authService';
import { VendorService } from '../services/vendorService';

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
  const [dashboardData, setDashboardData] = useState({
    requests: 0,
    upcomingBookings: 0,
    packages: 0,
    capacity: 0,
    bookedDates: [] as string[]
  });

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

  // Function to load dashboard data (matches Next.js implementation)
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
        bookedDates
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
          <ActivityIndicator size="large" color="#be185d" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  // If user is not a vendor or no vendor ID, show message
  if (!vendorId && user?.role !== 'vendor') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome!</Text>
            <Text style={styles.businessName}>{user?.full_name || 'User'}</Text>
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              <Text style={styles.businessName}>{businessName || 'Vendor'}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>

        {/* Overview Section - Matches Next.js exactly */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Overview</Text>
            <Text style={styles.liveDataText}>Live Data</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <View style={styles.statIconContainer}>
                <Inbox size={20} color="#ffffff" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>
                  {dashboardLoading ? '...' : dashboardData.requests}
                </Text>
                <Text style={styles.statLabel}>Pending Requests</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardGreen]}>
              <View style={styles.statIconContainer}>
                <CalendarCheck2 size={20} color="#ffffff" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>
                  {dashboardLoading ? '...' : dashboardData.upcomingBookings}
                </Text>
                <Text style={styles.statLabel}>Confirmed Bookings</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardPurple]}>
              <View style={styles.statIconContainer}>
                <Package size={20} color="#ffffff" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>
                  {dashboardLoading ? '...' : dashboardData.packages}
                </Text>
                <Text style={styles.statLabel}>Active Packages</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardOrange]}>
              <View style={styles.statIconContainer}>
                <Users size={20} color="#ffffff" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>
                  {dashboardLoading ? '...' : dashboardData.capacity}
                </Text>
                <Text style={styles.statLabel}>Daily Capacity</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Modern Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => navigation?.navigate('account/availability')}
            >
              <Calendar size={18} color="#ffffff" />
              <Text style={styles.actionButtonTextPrimary}>Manage Availability</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => navigation?.navigate('account/bookings')}
            >
              <Inbox size={18} color="#be185d" />
              <Text style={styles.actionButtonTextSecondary}>View Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => navigation?.navigate('account/availability')}
            >
              <Package size={18} color="#be185d" />
              <Text style={styles.actionButtonTextSecondary}>Manage Packages</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => navigation?.navigate('account')}
            >
              <Users size={18} color="#be185d" />
              <Text style={styles.actionButtonTextSecondary}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity - Matches Next.js */}
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <Clock size={16} color="#6b7280" />
              <Text style={styles.activityText}>
                {dashboardData.upcomingBookings} upcoming bookings confirmed
              </Text>
            </View>
            <View style={styles.activityItem}>
              <TrendingUp size={16} color="#6b7280" />
              <Text style={styles.activityText}>
                {dashboardData.requests} requests waiting for your response
              </Text>
            </View>
            {dashboardData.bookedDates.length > 0 && (
              <View style={styles.activityItem}>
                <Calendar size={16} color="#6b7280" />
                <Text style={styles.activityText}>
                  {dashboardData.bookedDates.length} dates booked this month
                </Text>
              </View>
            )}
          </View>
        </View>
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
    paddingBottom: 100, // Space for bottom nav
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
  header: {
    paddingVertical: 8, // Small padding below header
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
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
  overviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  liveDataText: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardBlue: {
    backgroundColor: '#3b82f6',
  },
  statCardGreen: {
    backgroundColor: '#10b981',
  },
  statCardPurple: {
    backgroundColor: '#8b5cf6',
  },
  statCardOrange: {
    backgroundColor: '#f59e0b',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonPrimary: {
    backgroundColor: '#be185d',
  },
  actionButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#be185d',
  },
  recentActivity: {
    marginBottom: 40, // Extra margin to ensure it's above bottom nav
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
});
