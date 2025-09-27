import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, X, User } from 'lucide-react-native';
import { useSupabase } from '../context/SupabaseContext';

interface HeaderProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

export function Header({ currentRoute = 'home', onNavigate }: HeaderProps) {
  const { user, signOut } = useSupabase();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => currentRoute === path;
  const isLandingPage = currentRoute === 'home';

  const handleNavigation = (path: string) => {
    onNavigate?.(path);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate?.('home');
    setMenuOpen(false);
  };

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          {/* Logo */}
          <TouchableOpacity 
            style={styles.logoContainer}
            onPress={() => onNavigate?.('home')}
          >
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
          </TouchableOpacity>


          {/* Mobile Menu Button */}
          <View style={styles.mobileMenuContainer}>
            {user ? (
              /* Profile Picture as Menu Button for authenticated users */
              <TouchableOpacity
                onPress={() => setMenuOpen(true)}
                style={styles.profileButton}
              >
                <View style={styles.profilePicture}>
                  {user.avatar_url ? (
                    <Image 
                      source={{ uri: user.avatar_url }} 
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profileIconContainer}>
                      <User size={14} color="#be185d" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              /* Regular Hamburger Menu Button for non-authenticated users */
              <TouchableOpacity
                onPress={() => setMenuOpen(true)}
                style={styles.hamburgerButton}
              >
                <Menu size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

      </View>

      {/* Mobile Menu Modal */}
        <Modal
          visible={menuOpen}
          transparent={true}
          animationType="none"
          onRequestClose={() => setMenuOpen(false)}
        >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            onPress={() => setMenuOpen(false)}
          />
          <View style={styles.mobileMenu}>
            <View style={styles.mobileMenuHeader}>
              <TouchableOpacity
                onPress={() => setMenuOpen(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.mobileMenuContent}>
              {user ? (
                /* Logged in user menu - Profile picture, name, and sign out button */
                <View style={styles.userProfileMenu}>
                  {/* Profile Picture Circle */}
                  <View style={styles.profilePictureContainer}>
                    <View style={styles.profilePictureCircle}>
                      {user.avatar_url ? (
                        <Image 
                          source={{ uri: user.avatar_url }} 
                          style={styles.profilePictureImage}
                        />
                      ) : (
                        <View style={styles.profilePictureIcon}>
                          <User size={50} color="#be185d" />
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {/* Vendor Name */}
                  <Text style={styles.vendorName}>{user.full_name || 'Vendor'}</Text>
                  
                  {/* Sign Out Button */}
                  <TouchableOpacity
                    onPress={handleLogout}
                    style={styles.signOutButton}
                  >
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Guest user menu */
                <View style={styles.guestMenu}>
                  <View style={styles.guestCard}>
                    <Text style={styles.guestTitle}>Welcome to Goafyi</Text>
                    <Text style={styles.guestSubtitle}>Sign in to access your account</Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => handleNavigation('signup')}
                    style={styles.simpleMenuItem}
                  >
                    <View style={styles.simpleMenuItemIcon}>
                      <User size={20} color="#be185d" />
                    </View>
                    <Text style={styles.simpleMenuItemText}>Partner with us</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handleNavigation('login')}
                    style={styles.simpleMenuItem}
                  >
                    <View style={styles.simpleMenuItemIcon}>
                      <User size={20} color="#be185d" />
                    </View>
                    <Text style={styles.simpleMenuItemText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#e5e7eb',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#f3f4f6',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d1d5db',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  mobileMenuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    padding: 4,
  },
  profilePicture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileIconContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalBackdrop: {
    flex: 1,
  },
  mobileMenu: {
    position: 'absolute',
    right: 0,
    top: 50,
    height: 'auto',
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
    padding: 20,
    paddingBottom: 16,
    borderRadius: 20,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.3)',
  },
  mobileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  mobileMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  
  // New simplified menu styles
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  menuLogo: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  
  // User Profile Menu Styles
  userProfileMenu: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  profilePictureContainer: {
    marginBottom: 8,
  },
  profilePictureCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(253, 242, 248, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#be185d',
    shadowColor: '#be185d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  profilePictureImage: {
    width: '100%',
    height: '100%',
    borderRadius: 51,
  },
  profilePictureIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  simpleUserMenu: {
    paddingTop: 8,
  },
  guestMenu: {
    paddingTop: 8,
  },
  guestCard: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
  },
  guestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  guestSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  simpleMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  simpleMenuItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(253, 242, 248, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  simpleMenuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  logoutText: {
    color: '#ef4444',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mobileMenuContent: {
    flex: 1,
  },
  landingMenuContent: {
    // gap removed - use marginBottom on child elements instead
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  welcomeLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  mobileNavButton: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  mobileNavButtonActive: {
    backgroundColor: '#fdf2f8',
  },
  mobileNavText: {
    fontSize: 14,
    color: '#374151',
  },
  mobileNavTextActive: {
    color: '#be185d',
  },
  mobileMenuFooter: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  authButtonsContainer: {
    // gap removed - use marginBottom on child elements instead
  },
  partnerButton: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  partnerButtonText: {
    color: '#374151',
    fontSize: 14,
    textAlign: 'center',
  },
  vendorLoginButton: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  vendorLoginText: {
    color: '#374151',
    fontSize: 14,
    textAlign: 'left',
  },
  mobileSignInButton: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#be185d',
  },
  mobileSignInButtonText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  userSection: {
    // gap removed - use marginBottom on child elements instead
  },
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userProfilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#fce7f3',
  },
  userProfileImage: {
    width: '100%',
    height: '100%',
  },
  userProfileIconContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userProfileText: {
    fontSize: 14,
    color: '#374151',
  },
});