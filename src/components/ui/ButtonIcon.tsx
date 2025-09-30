import React from 'react';
import { TouchableOpacity, View } from 'react-native';

interface ButtonIconProps {
  icon: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function ButtonIcon({
  icon,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  className = '',
}: ButtonIconProps) {
  const getButtonStyles = () => {
    const styles: any = {
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Variant styles
    switch (variant) {
      case 'default':
        styles.backgroundColor = '#be185d'; // bg-rose-600
        break;
      case 'destructive':
        styles.backgroundColor = '#dc2626'; // bg-red-600
        break;
      case 'outline':
        styles.backgroundColor = 'transparent';
        styles.borderWidth = 1;
        styles.borderColor = '#e2e8f0'; // border-gray-200
        break;
      case 'secondary':
        styles.backgroundColor = '#f1f5f9'; // bg-slate-100
        break;
      case 'ghost':
        styles.backgroundColor = 'transparent';
        break;
    }

    // Size styles
    switch (size) {
      case 'sm':
        styles.height = 32;
        styles.width = 32;
        break;
      case 'lg':
        styles.height = 48;
        styles.width = 48;
        break;
      default:
        styles.height = 40;
        styles.width = 40;
        break;
    }

    // Disabled styles
    if (disabled) {
      styles.opacity = 0.5;
    }

    return styles;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
    </TouchableOpacity>
  );
}
