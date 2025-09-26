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
          route: 'account'
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
                  size={16} // w-4 h-4
                  color={active ? '#be185d' : '#9ca3af'} // rose-600 : gray-400
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // bg-white/95
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6', // border-gray-100
    paddingVertical: 4, // py-1
    paddingHorizontal: 12, // px-3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: 400, // max-w-md
    alignSelf: 'center',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 6, // py-1.5
    paddingHorizontal: 8, // px-2
    borderRadius: 12, // rounded-xl
    flex: 1,
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: 'rgba(190, 24, 93, 0.1)', // bg-rose-50/80
    transform: [{ scale: 1.05 }], // scale-105
  },
  navItemInactive: {
    backgroundColor: 'transparent',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2, // mt-0.5
  },
  icon: {
    // Icon styling handled by lucide-react-native
  },
  iconActive: {
    color: '#be185d', // text-rose-600
  },
  iconInactive: {
    color: '#9ca3af', // text-gray-400
  },
  label: {
    fontSize: 10, // text-[10px]
    fontWeight: '500',
    marginTop: 2, // mt-0.5
    lineHeight: 12, // leading-tight
  },
  labelActive: {
    color: '#be185d', // text-rose-600
  },
  labelInactive: {
    color: '#9ca3af', // text-gray-400
  },
  badge: {
    position: 'absolute',
    top: -4, // -top-1
    right: -4, // -right-1
    backgroundColor: '#ef4444', // bg-red-500
    borderRadius: 8,
    minWidth: 16, // w-4
    height: 16, // h-4
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 8, // text-[8px]
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    top: -4, // -top-1
    right: -4, // -right-1
    width: 8, // w-2
    height: 8, // h-2
    backgroundColor: '#be185d', // bg-rose-500
    borderRadius: 4, // rounded-full
  },
});