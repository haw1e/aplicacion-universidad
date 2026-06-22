import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  BackHandler,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { requestAllWidgetsUpdate } from '@/widgets/widget-task-handler';

export default function QuickAddModalScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [pendingText, setPendingText] = useState('');
  const [saving, setSaving] = useState(false);

  // Automatically open the keyboard when the modal mounts
  const textInputRef = React.useRef<TextInput>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      textInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    Keyboard.dismiss();
    // Navigate back to main dashboard so subsequent normal opens start on Dashboard
    router.replace('/');
    setTimeout(() => {
      BackHandler.exitApp();
    }, 100);
  };

  const handleSave = async () => {
    if (!user) {
      showAlert({ title: 'Error ❌', message: 'No estás autenticado.' });
      return;
    }
    if (!pendingText.trim()) {
      showAlert({ title: 'Error ❌', message: 'Por favor escribe un pendiente.' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pendings')
        .insert([{ description: pendingText.trim(), user_id: user.id }]);

      if (error) throw error;

      // Request an immediate update to all Home Screen widgets in the background
      if (Platform.OS === 'android') {
        requestAllWidgetsUpdate();
      }

      // Dismiss keyboard, redirect to main and close app
      Keyboard.dismiss();
      router.replace('/');
      setTimeout(() => {
        BackHandler.exitApp();
      }, 100);
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo guardar: ' + e.message });
      setSaving(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Nuevo Pendiente Rápido ⚡</Text>
              <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.backgroundElement }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              ref={textInputRef}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundElement + '50',
                  borderColor: colors.border,
                },
              ]}
              placeholder="Ej. Comprar materiales para maqueta..."
              placeholderTextColor={colors.textSecondary + '80'}
              value={pendingText}
              onChangeText={setPendingText}
              multiline
              numberOfLines={3}
              maxLength={150}
              onSubmitEditing={handleSave}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.backgroundElement }]}
                onPress={handleClose}
                disabled={saving}
              >
                <Text style={[styles.btnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving || !pendingText.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.btnTextPrimary}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnTextPrimary: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
