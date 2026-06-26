import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/auth';
import { useAlert } from '@/context/AlertContext';
import { exportSupabaseBackupToFile } from '@/lib/backup';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, colors } = useTheme();
  const { user, signOut } = useAuth();
  const { showAlert, showConfirm } = useAlert();

  const handleExportMigrationBackup = async () => {
    if (!user) {
      showAlert({ title: 'Error ❌', message: 'Debes iniciar sesión para exportar tus datos.' });
      return;
    }
    try {
      await exportSupabaseBackupToFile(user.id);
      showAlert({ title: '¡Éxito! 💾', message: 'Tus datos de Supabase se han exportado correctamente en un formato listo para la versión local.' });
    } catch (error: any) {
      showAlert({ title: 'Error ❌', message: error.message });
    }
  };

  const renderOption = (
    label: string,
    description: string,
    mode: 'light' | 'dark' | 'system',
    icon: string
  ) => {
    const isActive = themeMode === mode;
    return (
      <TouchableOpacity
        style={[
          styles.optionCard,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: isActive ? colors.primary : colors.border,
            borderWidth: isActive ? 2 : 1.5,
          },
        ]}
        onPress={() => setThemeMode(mode)}
        activeOpacity={0.7}
      >
        <View style={styles.optionHeader}>
          <Text style={styles.optionIcon}>{icon}</Text>
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{description}</Text>
          </View>
        </View>
        
        {/* Active Radio Indicator */}
        <View
          style={[
            styles.radioCircle,
            {
              borderColor: isActive ? colors.primary : colors.textSecondary,
              backgroundColor: isActive ? colors.primary : 'transparent',
            },
          ]}
        >
          {isActive && <View style={styles.radioDot} />}
        </View>
      </TouchableOpacity>
    );
  };



  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Aspecto Visual y Tema 🎨</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Elige cómo deseas ver la interfaz de la aplicación.
        </Text>

        <View style={styles.optionsList}>
          {renderOption('Modo Claro ☀️', 'Colores claros y pastel ideales para usar de día.', 'light', '🌸')}
          {renderOption('Modo Oscuro 🌙', 'Colores oscuros suaves para descansar la vista de noche.', 'dark', '🍇')}
          {renderOption('Automático (Sistema) ⚙️', 'Se ajusta según la configuración de tu dispositivo.', 'system', '💻')}
        </View>


        {/* Migración Local */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Migración Local 💾</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Exporta tus datos para migrar a la nueva versión 100% sin conexión (Local).
        </Text>

        <TouchableOpacity
          style={[
            styles.optionCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
              borderWidth: 1.5,
              marginBottom: 16,
            },
          ]}
          onPress={handleExportMigrationBackup}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>📤</Text>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Exportar Datos para Migración</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Descarga un archivo .json compatible con la versión local e importa todos tus apuntes y tareas allí.
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Cuenta y Acceso */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Cuenta y Acceso 👤</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Cierra tu sesión actual de forma segura.
        </Text>
        
        <TouchableOpacity
          style={[
            styles.logoutCard,
            {
              backgroundColor: colors.error + '12',
              borderColor: colors.error,
              borderWidth: 1.5,
            },
          ]}
          onPress={() => {
            showConfirm({
              title: 'Cerrar Sesión 🚪',
              message: '¿Estás seguro de que deseas salir de tu cuenta? 🌸',
              confirmText: 'Cerrar Sesión',
              cancelText: 'Cancelar',
              type: 'danger',
              onConfirm: signOut,
            });
          }}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>🚪</Text>
            <View style={styles.optionInfo}>
              <Text style={[styles.logoutTitle, { color: colors.error }]}>Cerrar Sesión</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Salir de tu cuenta de Supabase en este dispositivo.</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 550, // Tablet-focused constraint
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 24,
  },
  optionsList: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  logoutCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    marginTop: 8,
  },
  logoutTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
}) as any;
