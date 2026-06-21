import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/auth';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import CompanionPet from '@/components/CompanionPet';

import { AlertProvider } from '@/context/AlertContext';

function InitialLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // Redirect to login if not logged in and trying to access protected routes
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      // Redirect to main screen if logged in and trying to access auth pages
      router.replace('/');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
      <CompanionPet />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AlertProvider>
          <InitialLayout />
        </AlertProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
