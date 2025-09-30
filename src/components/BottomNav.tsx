import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, User, LayoutDashboard, Calendar, Inbox } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';
import { supabase } from '../lib/supabase';

interface BottomNavProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

export function BottomNav({ currentRoute = 'home', onNavigate }: BottomNavProps) {
  const { user } = useSupabase();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => currentRoute === path;

  // If user is not logged in, don't show bottom navigation
  if (!user) {
    return null;
  }

  // Fetch unread message count for vendors
  useEffect(() => {
    if (user?.role === 'vendor' && user?.id) {
      const fetchUnreadCount = async () => {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        
        if (!error && count !== null) {
          setUnreadCount(count);
        }
      };

      fetchUnreadCount();
      
      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`
          }, 
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id, user?.role]);

      const navItems = user?.role === 'vendor' ? [
        { 
          id: 'dashboard', 
          label: 'Dashboard', 
          icon: LayoutDashboard,
          route: 'account/dashboard'
        },
        { 
          id: 'availability', 
          label: 'Availability', 
          icon: Calendar,
          route: 'account/availability'
        },
        { 
          id: 'bookings', 
          label: 'Bookings', 
          icon: Inbox,
          route: 'account/bookings',
          badge: unreadCount
        },
        { 
          id: 'account', 
          label: 'Profile', 
          icon: User,
          route: 'account'
        }
      ] : [
        { 
          id: 'home', 
          label: 'Home', 
          icon: Home,
          route: 'home'
        },
        { 
          id: 'bookings', 
          label: 'Bookings', 
          icon: Inbox,
          route: 'viewer/bookings'
        },
        { 
          id: 'account', 
          label: 'Profile', 
          icon: User,
          route: 'account/profile'
        }
      ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.navRow}>
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.route);
          
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                console.log('BottomNav: navigating to', item.route);
                onNavigate?.(item.route);
              }}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <View style={styles.iconContainer}>
                <IconComponent 
                  size={18}
                  color={active ? '#10b981' : '#6b7280'}
                />
                {active && (
                  <View style={styles.activeIndicator} />
                )}
                {item.badge && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  navItemActive: {
    backgroundColor: '#f0fdf4',
    transform: [{ scale: 1.02 }],
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  navItemInactive: {
    backgroundColor: 'transparent',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    // Icon styling handled by lucide-react-native
  },
  iconActive: {
    color: '#10b981',
  },
  iconInactive: {
    color: '#6b7280',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    lineHeight: 12,
    textAlign: 'center',
  },
  labelActive: {
    color: '#10b981',
  },
  labelInactive: {
    color: '#6b7280',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 4,
    height: 4,
    backgroundColor: '#10b981',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
});