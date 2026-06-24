export const LIGHT_COLORS = {
  primary: '#2563eb', // Blue
  secondary: '#3b82f6', // Lighter Blue
  background: '#f9fafb', // Light Gray
  card: '#ffffff', // White
  text: '#1f2937', // Dark Gray
  textLight: '#6b7280', // Medium Gray
  border: '#e5e7eb', // Light Border
  error: '#ef4444', // Red
  success: '#10b981', // Green
  warning: '#f59e0b', // Orange
  white: '#ffffff',
  black: '#000000',
  inputBackground: '#f3f4f6',
  shadow: '#000000',
};

export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
}


export const DARK_COLORS = {
  primary: '#3b82f6', // Slightly lighter blue for dark mode
  secondary: '#60a5fa', // Even lighter blue
  background: '#111827', // Very dark gray/black
  card: '#1f2937', // Dark gray
  text: '#f9fafb', // Light gray/white
  textLight: '#9ca3af', // Medium light gray
  border: '#374151', // Darker border
  error: '#f87171', // Lighter red
  success: '#34d399', // Lighter green
  warning: '#fbbf24', // Lighter orange
  white: '#ffffff',
  black: '#000000',
  inputBackground: '#374151',
  shadow: '#000000',
};

export const COLORS = LIGHT_COLORS; // Default for backward compatibility

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
  full: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
};
