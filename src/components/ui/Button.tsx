import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const baseClasses = 'flex-row items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };

  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };

  const textSizeClasses = {
    default: 'text-sm',
    sm: 'text-sm',
    lg: 'text-base',
    icon: 'text-sm',
  };

  const textVariantClasses = {
    default: 'text-white font-semibold',
    destructive: 'text-white font-semibold',
    outline: 'text-foreground font-semibold',
    secondary: 'text-secondary-foreground font-semibold',
    ghost: 'text-foreground font-semibold',
    link: 'text-primary font-semibold',
  };

  // Convert Tailwind classes to React Native styles
  const getButtonStyles = () => {
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    
    // Map Tailwind classes to React Native styles
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
      case 'link':
        styles.backgroundColor = 'transparent';
        break;
    }

    // Size styles
    switch (size) {
      case 'sm':
        styles.height = 36;
        styles.paddingHorizontal = 12;
        styles.paddingVertical = 6;
        break;
      case 'lg':
        styles.height = 44;
        styles.paddingHorizontal = 32;
        styles.paddingVertical = 8;
        break;
      case 'icon':
        styles.height = 40;
        styles.width = 40;
        styles.paddingHorizontal = 0;
        styles.paddingVertical = 0;
        break;
      default:
        styles.height = 40;
        styles.paddingHorizontal = 16;
        styles.paddingVertical = 8;
        break;
    }

    // Disabled styles
    if (disabled) {
      styles.opacity = 0.5;
    }

    return styles;
  };

  const getTextStyles = () => {
    const styles: any = {
      fontSize: size === 'sm' ? 14 : size === 'lg' ? 16 : 14,
      fontWeight: '600',
    };

    // Text color based on variant
    switch (variant) {
      case 'default':
      case 'destructive':
        styles.color = '#ffffff';
        break;
      case 'outline':
      case 'ghost':
        styles.color = '#111827'; // text-gray-900
        break;
      case 'secondary':
        styles.color = '#475569'; // text-slate-600
        break;
      case 'link':
        styles.color = '#be185d'; // text-rose-600
        break;
    }

    return styles;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'default' || variant === 'destructive' ? '#ffffff' : '#111827'} 
        />
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
