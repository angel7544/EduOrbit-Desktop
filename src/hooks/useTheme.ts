import { useThemeStore } from '../store/themeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

export const useTheme = () => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  return {
    isDarkMode,
    toggleTheme,
    setTheme,
    colors,
  };
};
