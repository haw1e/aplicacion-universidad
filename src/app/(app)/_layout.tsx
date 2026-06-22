import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.backgroundCard,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // We will use a custom beautiful header on the Dashboard
        }}
      />
      <Stack.Screen
        name="tasks"
        options={{
          title: 'Tareas y Pendientes 📝',
        }}
      />
      <Stack.Screen
        name="evaluations"
        options={{
          title: 'Evaluaciones 📝',
        }}
      />
      <Stack.Screen
        name="exams"
        options={{
          title: 'Exámenes 🎓',
        }}
      />
      <Stack.Screen
        name="calendar"
        options={{
          title: 'Mi Calendario 📅',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Mi Perfil 👤',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Configuraciones ⚙️',
        }}
      />
      <Stack.Screen
        name="quick-add-modal"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
