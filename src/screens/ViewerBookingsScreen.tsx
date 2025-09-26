import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, User, Phone, Mail, Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { BookingService } from '../services/bookingService';
import { RequestService } from '../services/requestService';

interface ViewerBookingsScreenProps {
  navigation?: any;
}

export default function ViewerBookingsScreen({ navigation }: ViewerBookingsScreenProps) {
  const { user } = useSupabase();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'pending' | 'booked'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [bookedRequests, setBookedRequests] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Load user requests
        const requestsData = await RequestService.listViewerRequests(user.id);
        
        // Filter requests by status
        const pending = requestsData.filter(req => req.status === 'accepted');
        const booked = requestsData.filter(req => req.status === 'confirmed');
        const pendingRequests = requestsData.filter(req => req.status === 'pending');
        
        setRequests(pendingRequests);
        setPendingRequests(pending);
        setBookedRequests(booked);
        
      } catch (error) {
        console.error('Error loading bookings data:', error);
        Alert.alert('Error', 'Failed to load bookings data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'accepted':
        return '#f59e0b';
      case 'pending':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return CheckCircle;
      case 'accepted':
        return DollarSign;
      case 'pending':
        return Clock;
      case 'cancelled':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const renderBookingItem = (booking: any) => {
    const StatusIcon = getStatusIcon(booking.status);
    const statusColor = getStatusColor(booking.status);
    
    return (
      <View key={booking.id} style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>{booking.vendor?.business_name || 'Vendor'}</Text>
            <Text style={styles.bookingDate}>{booking.event_date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <StatusIcon size={12} color="white" />
            <Text style={styles.statusText}>{booking.status}</Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color="#6b7280" />
            <Text style={styles.detailText}>{booking.event_date}</Text>
          </View>
          {booking.vendor?.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>📍 {booking.vendor.location}</Text>
            </View>
          )}
          {booking.total_amount && (
            <View style={styles.detailRow}>
              <Text style={styles.amountText}>₹{booking.total_amount.toLocaleString()}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderRequestItem = (request: any) => {
    const StatusIcon = getStatusIcon(request.status);
    const statusColor = getStatusColor(request.status);
    
    return (
      <View key={request.id} style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>Booking Request</Text>
            <Text style={styles.bookingDate}>
              {request.dates?.map((d: any) => d.event_date).join(', ')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <StatusIcon size={12} color="white" />
            <Text style={styles.statusText}>{request.status}</Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <User size={16} color="#6b7280" />
            <Text style={styles.detailText}>{request.vendor?.business_name || 'Vendor'}</Text>
          </View>
          {request.vendor?.contact_phone && (
            <View style={styles.detailRow}>
              <Phone size={16} color="#6b7280" />
              <Text style={styles.detailText}>{request.vendor.contact_phone}</Text>
            </View>
          )}
          {request.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Your Notes:</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}
          {request.counter_offer_details && (
            <View style={styles.counterOfferContainer}>
              <Text style={styles.counterOfferLabel}>Vendor Response:</Text>
              <Text style={styles.counterOfferText}>{request.counter_offer_details}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPendingItem = (request: any) => {
    const StatusIcon = getStatusIcon(request.status);
    const statusColor = getStatusColor(request.status);
    
    return (
      <View key={request.id} style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>Payment Pending</Text>
            <Text style={styles.bookingDate}>
              {request.dates?.map((d: any) => d.event_date).join(', ')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <StatusIcon size={12} color="white" />
            <Text style={styles.statusText}>Payment Pending</Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <User size={16} color="#6b7280" />
            <Text style={styles.detailText}>{request.vendor?.business_name || 'Vendor'}</Text>
          </View>
          {request.package && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>Package: {request.package.title}</Text>
            </View>
          )}
          {request.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Your Notes:</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.paymentPendingInfo}>
          <Text style={styles.paymentPendingText}>
            Please contact the vendor to arrange payment. Once payment is confirmed by the vendor, your booking will be confirmed.
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#be185d" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
          <Text style={styles.subtitle}>View your bookings and requests</Text>
        </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Payment Pending ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'booked' && styles.activeTab]}
          onPress={() => setActiveTab('booked')}
        >
          <Text style={[styles.tabText, activeTab === 'booked' && styles.activeTabText]}>
            Booked ({bookedRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'requests' ? (
          requests.length > 0 ? (
            <View style={styles.list}>
              {requests.map(renderRequestItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Clock size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No requests yet</Text>
              <Text style={styles.emptyStateSubtext}>Your booking requests will appear here</Text>
            </View>
          )
        ) : activeTab === 'pending' ? (
          pendingRequests.length > 0 ? (
            <View style={styles.list}>
              {pendingRequests.map(renderPendingItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <DollarSign size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No pending payments</Text>
              <Text style={styles.emptyStateSubtext}>Accepted requests waiting for payment will appear here</Text>
            </View>
          )
        ) : (
          bookedRequests.length > 0 ? (
            <View style={styles.list}>
              {bookedRequests.map(renderRequestItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No confirmed bookings</Text>
              <Text style={styles.emptyStateSubtext}>Your confirmed bookings will appear here</Text>
            </View>
          )
        )}
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    paddingHorizontal: 16,
    paddingVertical: 8, // Small padding below header
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#be185d',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  list: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  bookingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  notesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0369a1',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#0c4a6e',
  },
  counterOfferContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  counterOfferLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
    marginBottom: 4,
  },
  counterOfferText: {
    fontSize: 14,
    color: '#78350f',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  paymentPendingInfo: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  paymentPendingText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});
