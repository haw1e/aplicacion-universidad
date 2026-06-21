import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { appStorage } from '@/lib/storage';
import { Colors, ThemeColors } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  isDark: boolean;
  companionPet: string;
  setCompanionPet: (pet: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [companionPet, setCompanionPetState] = useState<string>('none');

  useEffect(() => {
    // Load saved preference from appStorage
    appStorage.getItem('theme_preference')
      .then(saved => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      })
      .catch(e => console.log('Error loading theme preference:', e));

    // Load saved companion pet preference
    appStorage.getItem('companion_pet')
      .then(saved => {
        if (saved) {
          setCompanionPetState(saved);
        }
      })
      .catch(e => console.log('Error loading companion pet:', e));
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await appStorage.setItem('theme_preference', mode);
    } catch (e) {
      console.log('Error saving theme preference:', e);
    }
  };

  const setCompanionPet = async (pet: string) => {
    setCompanionPetState(pet);
    try {
      await appStorage.setItem('companion_pet', pet);
    } catch (e) {
      console.log('Error saving companion pet preference:', e);
    }
  };

  const activeScheme = themeMode === 'system' ? systemScheme : themeMode;
  const isDark = activeScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, colors, isDark, companionPet, setCompanionPet }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
