import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SupabaseProvider, useSupabase } from './src/context/SupabaseContext';
import LandingScreen from './src/screens/LandingScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import AccountScreen from './src/screens/AccountScreen';
import VendorProfileScreen from './src/screens/VendorProfileScreen';
import VendorDashboardScreen from './src/screens/VendorDashboardScreen';
import VendorAvailabilityScreen from './src/screens/VendorAvailabilityScreen';
import VendorBookingsScreen from './src/screens/VendorBookingsScreen';
import ViewerBookingsScreen from './src/screens/ViewerBookingsScreen';
import { BottomNav } from './src/components/BottomNav';
import { Header } from './src/components/Header';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function MainApp() {
  const [currentScreen, setCurrentScreen] = React.useState('home');
  const [selectedVendorId, setSelectedVendorId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleNavigate = (screen: string, vendorId?: string) => {
    console.log('handleNavigate called with:', screen, vendorId);
    if (screen === 'vendor-profile' && vendorId) {
      setSelectedVendorId(vendorId);
      setCurrentScreen('vendor-profile');
    } else {
      setCurrentScreen(screen);
      setSelectedVendorId(null);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Clear all caches
      const { VendorService } = await import('./src/services/vendorService');
      const { RatingService } = await import('./src/services/ratingService');
      const { CacheManager } = await import('./src/lib/cacheManager');
      
      await VendorService.clearAllVendorCache();
      await RatingService.clearAllCache();
      await CacheManager.clearAllCaches();
      
      console.log('✅ App refreshed - all caches cleared');
    } catch (error) {
      console.error('❌ Error refreshing app:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

      const renderScreen = () => {
        switch (currentScreen) {
          case 'login':
            return <LoginScreen navigation={{ navigate: handleNavigate, goBack: () => setCurrentScreen('home') }} />;
          case 'signup':
            return <SignupScreen navigation={{ navigate: handleNavigate, goBack: () => setCurrentScreen('home') }} />;
          case 'account':
            return <AccountScreen />;
          case 'account/dashboard':
            return <VendorDashboardScreen navigation={{ navigate: handleNavigate }} />;
          case 'account/availability':
            return <VendorAvailabilityScreen navigation={{ navigate: handleNavigate }} />;
          case 'account/bookings':
            return <VendorBookingsScreen navigation={{ navigate: handleNavigate }} />;
          case 'viewer/bookings':
            return <ViewerBookingsScreen navigation={{ navigate: handleNavigate }} />;
          case 'vendor-profile':
            return selectedVendorId ? (
              <VendorProfileScreen 
                vendorId={selectedVendorId} 
                navigation={{ navigate: handleNavigate, goBack: () => setCurrentScreen('home') }} 
              />
            ) : null;
          default:
            return <LandingScreen navigation={{ navigate: handleNavigate }} />;
        }
      };

  return (
    <View style={{ flex: 1 }}>
      <Header currentRoute={currentScreen} onNavigate={handleNavigate} />
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#be185d"
            colors={['#be185d']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderScreen()}
      </ScrollView>
      <BottomNav currentRoute={currentScreen} onNavigate={handleNavigate} />
    </View>
  );
}

function AppNavigator() {
  const { user, loading } = useSupabase();

  if (loading) {
    return <LoadingScreen />;
  }

  // Always show the main app (landing page) - users can browse without logging in
  // Authentication is handled through the UI (login buttons, etc.)
  return <MainApp />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SupabaseProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </SupabaseProvider>
    </SafeAreaProvider>
  );
}
