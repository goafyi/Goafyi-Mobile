import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, User, Phone, Mail, Clock, CheckCircle, XCircle, AlertCircle, Bell, X, DollarSign, Calendar as CalendarIcon } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { BookingService } from '../services/bookingService';
import { RequestService } from '../services/requestService';
import { AuthService } from '../services/authService';
import { AvailabilityService } from '../services/availabilityService';
import { supabase } from '../lib/supabase';

interface VendorBookingsScreenProps {
  navigation?: any;
}

export default function VendorBookingsScreen({ navigation }: VendorBookingsScreenProps) {
  const { user } = useSupabase();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'pending' | 'booked'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [showRequestDetail, setShowRequestDetail] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load vendor ID first
  useEffect(() => {
    const loadVendorId = async () => {
      try {
        if (!user?.id) return;
        // Use cached vendor ID for better performance
        const vendorIdResult = await AuthService.getVendorId(user.id);
        if (vendorIdResult) {
          setVendorId(vendorIdResult);
          console.log('✅ Bookings: Got vendor ID:', vendorIdResult);
        }
      } catch (error) {
        console.error('Failed to load vendor ID:', error);
      } finally {
        setLoading(false);
      }
    };
    loadVendorId();
  }, [user?.id]);

  // Load requests when vendor ID is available
  useEffect(() => {
    loadRequests();
  }, [vendorId]);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) return;
      
      try {
        console.log('🔄 Bookings: Loading notifications for user:', user.id);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false });
        
        if (!error) {
          console.log('✅ Bookings: Loaded notifications:', data?.length || 0);
          setNotifications(data || []);
        } else {
          console.error('Error loading notifications:', error);
        }
      } catch (e) { 
        console.error('Failed to load notifications:', e); 
      }
    };
    loadNotifications();
  }, [user?.id]);

  // Real-time subscriptions
  useEffect(() => {
    if (!vendorId || !user?.id) return;

    console.log('🔄 Bookings: Setting up real-time subscriptions');

    // Subscribe to booking requests changes
    const requestsSubscription = supabase
      .channel('bookings-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `vendor_id=eq.${vendorId}`
        },
        (payload) => {
          console.log('🔄 Bookings: Real-time request update received:', payload);
          // Reload requests when they change
          loadRequests();
        }
      )
      .subscribe();

    // Subscribe to messages/notifications changes
    const notificationsSubscription = supabase
      .channel('bookings-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('🔄 Bookings: Real-time notification update received:', payload);
          // Reload notifications when they change
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Bookings: Cleaning up real-time subscriptions');
      requestsSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
    };
  }, [vendorId, user?.id]);

  // Function to load requests (used by real-time subscriptions)
  const loadRequests = async () => {
    if (!vendorId) return;
    
    try {
      console.log('🔄 Bookings: Loading requests for vendor:', vendorId);
      const data = await RequestService.listVendorRequests(vendorId);
      console.log('✅ Bookings: Loaded requests:', data.map(r => ({ id: r.id, status: r.status })));
      setRequests(data);
      console.log('✅ Bookings: Requests updated in real-time');
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  // Function to load notifications (used by real-time subscriptions)
  const loadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔄 Bookings: Loading notifications for user:', user.id);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (!error) {
        console.log('✅ Bookings: Loaded notifications:', data?.length || 0);
        setNotifications(data || []);
        console.log('✅ Bookings: Notifications updated in real-time');
      } else {
        console.error('Error loading notifications:', error);
      }
    } catch (e) { 
      console.error('Failed to load notifications:', e); 
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
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
      case 'pending':
        return Clock;
      case 'cancelled':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    if (!vendorId) return;
    
    setIsProcessing(true);
    try {
      const status = action === 'accept' ? 'accepted' : 'declined';
      await RequestService.updateStatus(requestId, status);
      
      // Reload requests
      await loadRequests();
      
      Alert.alert('Success', `Request ${action}ed successfully`);
    } catch (error) {
      console.error('Error updating request:', error);
      Alert.alert('Error', 'Failed to update request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async (requestId: string) => {
    if (!vendorId) return;
    
    setIsProcessing(true);
    try {
      // Update status to confirmed
      await RequestService.updateStatus(requestId, 'confirmed');
      
      // Get the request details to mark dates as unavailable
      const request = requests.find(r => r.id === requestId);
      if (request && request.dates) {
        // Mark all dates as blocked
        const dates = request.dates.map((dateRecord: any) => dateRecord.event_date);
        try {
          await AvailabilityService.addBlockedDates(vendorId, dates, 'Booking confirmed');
        } catch (blockError) {
          console.error('Error blocking dates:', blockError);
        }
      }
      
      // Reload requests
      await loadRequests();
      
      Alert.alert('Success', 'Payment confirmed! Booking is now confirmed and dates are marked as unavailable.');
    } catch (error) {
      console.error('Error confirming payment:', error);
      Alert.alert('Error', 'Failed to confirm payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setShowRequestDetail(true);
  };

  const renderBookingItem = (booking: any) => {
    const StatusIcon = getStatusIcon(booking.status);
    const statusColor = getStatusColor(booking.status);
    
    return (
      <View key={booking.id} style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>{booking.vendor?.business_name || 'Booking'}</Text>
            <Text style={styles.bookingDate}>{booking.event_date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <StatusIcon size={12} color="white" />
            <Text style={styles.statusText}>{booking.status}</Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <User size={16} color="#6b7280" />
            <Text style={styles.detailText}>{booking.user?.full_name || 'Customer'}</Text>
          </View>
          {booking.user?.phone && (
            <View style={styles.detailRow}>
              <Phone size={16} color="#6b7280" />
              <Text style={styles.detailText}>{booking.user.phone}</Text>
            </View>
          )}
          {booking.user?.email && (
            <View style={styles.detailRow}>
              <Mail size={16} color="#6b7280" />
              <Text style={styles.detailText}>{booking.user.email}</Text>
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
      <TouchableOpacity 
        key={request.id} 
        style={styles.bookingCard}
        onPress={() => handleViewRequest(request)}
      >
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
            <Text style={styles.detailText}>{request.user?.full_name || 'Customer'}</Text>
          </View>
          {request.user?.phone && (
            <View style={styles.detailRow}>
              <Phone size={16} color="#6b7280" />
              <Text style={styles.detailText}>{request.user.phone}</Text>
            </View>
          )}
          {request.user?.email && (
            <View style={styles.detailRow}>
              <Mail size={16} color="#6b7280" />
              <Text style={styles.detailText}>{request.user.email}</Text>
            </View>
          )}
          {request.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}
        </View>
        
        {request.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleRequestAction(request.id, 'accept')}
              disabled={isProcessing}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRequestAction(request.id, 'reject')}
              disabled={isProcessing}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {request.status === 'accepted' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmPaymentButton]}
              onPress={() => handleConfirmPayment(request.id)}
              disabled={isProcessing}
            >
              <DollarSign size={16} color="white" />
              <Text style={styles.confirmPaymentButtonText}>Confirm Payment</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.viewDetailsHint}>
          <Text style={styles.viewDetailsText}>Tap to view full details</Text>
        </View>
      </TouchableOpacity>
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
      {/* Green Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Bookings</Text>
          <Text style={styles.headerSubtitle}>Manage your booking requests</Text>
        </View>
      </View>

      {/* Overlapping Menu Buttons */}
      <View style={styles.overlappingMenuContainer}>
        <View style={styles.menuButtons}>
          <TouchableOpacity
            style={[styles.menuButton, activeTab === 'requests' && styles.activeMenuButton]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.menuButtonText, activeTab === 'requests' && styles.activeMenuButtonText]}>
              Requests ({requests.filter(r => r.status === 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, activeTab === 'pending' && styles.activeMenuButton]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.menuButtonText, activeTab === 'pending' && styles.activeMenuButtonText]}>
              Pending ({requests.filter(r => r.status === 'accepted' || r.status === 'settled_offline').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, activeTab === 'booked' && styles.activeMenuButton]}
            onPress={() => setActiveTab('booked')}
          >
            <Text style={[styles.menuButtonText, activeTab === 'booked' && styles.activeMenuButtonText]}>
              Booked ({requests.filter(r => r.status === 'confirmed').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Notifications Section */}
        {notifications.length > 0 && (
          <View style={styles.notificationsSection}>
            <View style={styles.notificationsHeader}>
              <Bell size={16} color="#10b981" />
              <Text style={styles.notificationsTitle}>Notifications</Text>
            </View>
            <View style={styles.notificationsList}>
              {notifications.slice(0, 3).map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <Text style={styles.notificationText}>{notification.content}</Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notification.created_at).toLocaleString()}
                  </Text>
                </View>
              ))}
              {notifications.length > 3 && (
                <Text style={styles.notificationMore}>
                  +{notifications.length - 3} more notifications
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <View style={styles.tabContent}>
              <Text style={styles.tabTitle}>Pending Requests</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#be185d" />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : requests.filter(r => r.status === 'pending').length === 0 ? (
                <View style={styles.emptyState}>
                  <Clock size={48} color="#9ca3af" />
                  <Text style={styles.emptyStateText}>No requests yet</Text>
                  <Text style={styles.emptyStateSubtext}>New booking requests will appear here</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {requests.filter(r => r.status === 'pending').map(renderRequestItem)}
                </View>
              )}
            </View>
          )}

          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <View style={styles.tabContent}>
              <Text style={styles.tabTitle}>Pending Payment</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#be185d" />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : requests.filter(r => r.status === 'accepted' || r.status === 'settled_offline').length === 0 ? (
                <View style={styles.emptyState}>
                  <Clock size={48} color="#9ca3af" />
                  <Text style={styles.emptyStateText}>No pending payments</Text>
                  <Text style={styles.emptyStateSubtext}>Accepted requests awaiting payment will appear here</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {requests.filter(r => r.status === 'accepted' || r.status === 'settled_offline').map(renderRequestItem)}
                </View>
              )}
            </View>
          )}

          {/* Booked Tab */}
          {activeTab === 'booked' && (
            <View style={styles.tabContent}>
              <Text style={styles.tabTitle}>Confirmed Bookings</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#be185d" />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : requests.filter(r => r.status === 'confirmed').length === 0 ? (
                <View style={styles.emptyState}>
                  <CheckCircle size={48} color="#9ca3af" />
                  <Text style={styles.emptyStateText}>No confirmed bookings yet</Text>
                  <Text style={styles.emptyStateSubtext}>Confirmed bookings will appear here</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {requests.filter(r => r.status === 'confirmed').map(renderRequestItem)}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Request Detail Modal */}
      <Modal
        visible={showRequestDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRequestDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.requestDetailModal}>
            <View style={styles.requestDetailHeader}>
              <View style={styles.requestDetailTitleContainer}>
                <Text style={styles.requestDetailTitle}>Booking Request Details</Text>
                <Text style={styles.requestDetailSubtitle}>
                  Request #{selectedRequest?.id?.slice(-8)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRequestDetail(false)}
                style={styles.requestDetailCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.requestDetailBody} showsVerticalScrollIndicator={false}>
              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Status</Text>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedRequest?.status) }]}>
                  {React.createElement(getStatusIcon(selectedRequest?.status), { size: 16, color: 'white' })}
                  <Text style={styles.statusTextLarge}>{selectedRequest?.status}</Text>
                </View>
              </View>

              {/* Customer Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Customer</Text>
                <View style={styles.simpleInfoCard}>
                  <Text style={styles.simpleInfoText}>
                    <Text style={styles.simpleInfoLabel}>Name: </Text>
                    {selectedRequest?.user?.full_name || 'Not provided'}
                  </Text>
                  <Text style={styles.simpleInfoText}>
                    <Text style={styles.simpleInfoLabel}>Phone: </Text>
                    {selectedRequest?.user?.phone || 'Not provided'}
                  </Text>
                  <Text style={styles.simpleInfoText}>
                    <Text style={styles.simpleInfoLabel}>Email: </Text>
                    {selectedRequest?.user?.email || 'Not provided'}
                  </Text>
                </View>
              </View>

              {/* Package Information */}
              {selectedRequest?.package && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Package</Text>
                  <View style={styles.simpleInfoCard}>
                    <Text style={styles.simpleInfoText}>
                      <Text style={styles.simpleInfoLabel}>Title: </Text>
                      {selectedRequest.package.title}
                    </Text>
                    <Text style={styles.simpleInfoText}>
                      <Text style={styles.simpleInfoLabel}>Price: </Text>
                      {selectedRequest.package.pricing_type === 'fixed' 
                        ? `₹${selectedRequest.package.price?.toLocaleString()}`
                        : `₹${selectedRequest.package.price_per_person}/person`
                      }
                    </Text>
                    <Text style={styles.simpleInfoText}>
                      <Text style={styles.simpleInfoLabel}>Type: </Text>
                      {selectedRequest.package.pricing_type === 'fixed' ? 'Fixed Price' : 'Per Person'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Requested Dates */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Requested Dates</Text>
                <View style={styles.simpleInfoCard}>
                  {selectedRequest?.dates?.map((dateRecord: any, index: number) => (
                    <Text key={index} style={styles.simpleInfoText}>
                      <Text style={styles.simpleInfoLabel}>Date {index + 1}: </Text>
                      {dateRecord.event_date}
                    </Text>
                  ))}
                </View>
              </View>

              {/* Additional Information */}
              {selectedRequest?.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Notes</Text>
                  <View style={styles.simpleInfoCard}>
                    <Text style={styles.simpleInfoText}>{selectedRequest.notes}</Text>
                  </View>
                </View>
              )}

              {/* Requested Changes */}
              {selectedRequest?.requested_changes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Requested Changes</Text>
                  <View style={styles.simpleInfoCard}>
                    <Text style={styles.simpleInfoText}>{selectedRequest.requested_changes}</Text>
                  </View>
                </View>
              )}
              
              {/* Extra spacing at bottom */}
              <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Action Buttons */}
            {selectedRequest?.status === 'pending' && (
              <View style={styles.requestDetailActions}>
                <TouchableOpacity
                  style={[styles.actionButtonLarge, styles.rejectButtonLarge]}
                  onPress={() => {
                    setShowRequestDetail(false);
                    handleRequestAction(selectedRequest.id, 'reject');
                  }}
                  disabled={isProcessing}
                >
                  <XCircle size={20} color="white" />
                  <Text style={styles.rejectButtonTextLarge}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButtonLarge, styles.acceptButtonLarge]}
                  onPress={() => {
                    setShowRequestDetail(false);
                    handleRequestAction(selectedRequest.id, 'accept');
                  }}
                  disabled={isProcessing}
                >
                  <CheckCircle size={20} color="white" />
                  <Text style={styles.acceptButtonTextLarge}>Accept</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedRequest?.status === 'accepted' && (
              <View style={styles.requestDetailActions}>
                <TouchableOpacity
                  style={[styles.actionButtonLarge, styles.confirmPaymentButtonLarge]}
                  onPress={() => {
                    setShowRequestDetail(false);
                    handleConfirmPayment(selectedRequest.id);
                  }}
                  disabled={isProcessing}
                >
                  <DollarSign size={20} color="white" />
                  <Text style={styles.confirmPaymentButtonTextLarge}>Confirm Payment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  // Header Section
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
  headerContent: {
    alignItems: 'center',
    marginBottom: 0,
  },
  overlappingMenuContainer: {
    marginTop: -20,
    paddingHorizontal: 20,
    zIndex: 10,
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
  menuButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  menuButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  activeMenuButton: {
    backgroundColor: '#10b981',
    borderWidth: 0,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  menuButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  activeMenuButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // Notifications Section
  notificationsSection: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  notificationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  notificationsList: {
    gap: 6,
  },
  notificationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 0,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationText: {
    fontSize: 12,
    color: '#10b981',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 10,
    color: '#059669',
  },
  notificationMore: {
    fontSize: 10,
    color: '#059669',
    textAlign: 'center',
    marginTop: 4,
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
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  tabContent: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  bookingDate: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
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
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Request Detail Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  requestDetailModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '95%',
    minHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  requestDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#be185d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  requestDetailTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  requestDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  requestDetailSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  requestDetailCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  requestDetailBody: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  requestDetailActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  // Detail Section Styles
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  // Customer Info Styles
  customerInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  customerInfoText: {
    flex: 1,
  },
  customerInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  customerInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  // Package Info Styles
  packageInfoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#be185d',
    marginBottom: 4,
  },
  packageType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0369a1',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  // Dates Styles
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf2f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fce7f3',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#be185d',
  },

  // Notes Styles
  notesCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  // Timeline Styles
  timelineCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  // Action Button Styles
  actionButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonLarge: {
    backgroundColor: '#10b981',
  },
  rejectButtonLarge: {
    backgroundColor: '#ef4444',
  },
  confirmPaymentButtonLarge: {
    backgroundColor: '#059669',
  },
  acceptButtonTextLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  rejectButtonTextLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  confirmPaymentButtonTextLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // Updated existing styles
  confirmPaymentButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmPaymentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  viewDetailsHint: {
    marginTop: 8,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },

  // Simple Info Styles
  simpleInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  simpleInfoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 20,
  },
  simpleInfoLabel: {
    fontWeight: '600',
    color: '#111827',
  },

  // Bottom spacing
  bottomSpacing: {
    height: 20,
  },
});
