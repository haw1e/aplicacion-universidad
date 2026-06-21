import { Platform } from 'react-native';

export interface ThemeColors {
  readonly text: string;
  readonly background: string;
  readonly backgroundCard: string;
  readonly backgroundElement: string;
  readonly backgroundSelected: string;
  readonly textSecondary: string;
  readonly primary: string;
  readonly primaryLight: string;
  readonly secondary: string;
  readonly border: string;
  readonly success: string;
  readonly error: string;
  readonly warning: string;
}

export const Colors: {
  readonly light: ThemeColors;
  readonly dark: ThemeColors;
} = {
  light: {
    text: '#2C1B20',
    background: '#FFF5F7',
    backgroundCard: '#FFFFFF',
    backgroundElement: '#FFE3EA',
    backgroundSelected: '#FFCCD8',
    textSecondary: '#8A757B',
    primary: '#FF4B87',
    primaryLight: '#FFB8D2',
    secondary: '#B37FEB',
    border: '#FFD3DF',
    success: '#4CAF50',
    error: '#FF5252',
    warning: '#FFC107',
  },
  dark: {
    text: '#FFF0F3',
    background: '#150A0D',
    backgroundCard: '#221116',
    backgroundElement: '#3D1C25',
    backgroundSelected: '#5C2836',
    textSecondary: '#A89299',
    primary: '#FF649B',
    primaryLight: '#8A2D4C',
    secondary: '#D3ADFF',
    border: '#4D2430',
    success: '#81C784',
    error: '#FF8A80',
    warning: '#FFE082',
  },
};

export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Courier',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 900;
