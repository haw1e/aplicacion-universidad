import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { appStorage } from '@/lib/storage';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useAlert();

  // State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  
  // Password change state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Loaders
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || '');
      loadLocalProfilePhoto();
      fetchProfile();
    }
  }, [user]);

  const loadLocalProfilePhoto = async () => {
    try {
      const storedPhoto = await appStorage.getItem('profile_photo');
      if (storedPhoto) {
        setPhotoUri(storedPhoto);
      }
    } catch (e) {
      console.log('Error loading local profile photo:', e);
    }
  };

  const fetchProfile = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (data && !error) {
        if (data.full_name) {
          setFullName(data.full_name);
        }
        if (data.avatar_url) {
          setPhotoUri(data.avatar_url);
          await appStorage.setItem('profile_photo', data.avatar_url);
        }
      }
    } catch (e) {
      console.log('Error fetching profile from database:', e);
    }
  };

  const handlePickImage = async () => {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: 'Permiso Requerido 📸', message: 'Necesitamos permisos para acceder a tu galería y elegir una foto.' });
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const asset = result.assets[0];
        const base64Data = asset.base64;

        if (!base64Data) {
          throw new Error('No se pudo obtener el contenido en base64 de la imagen.');
        }

        const base64Url = `data:image/jpeg;base64,${base64Data}`;

        setProfileLoading(true);
        // Save to Supabase DB
        const { error: dbErr } = await supabase
          .from('profiles')
          .update({ avatar_url: base64Url })
          .eq('id', user?.id);

        if (dbErr) throw dbErr;

        // Save locally
        setPhotoUri(base64Url);
        await appStorage.setItem('profile_photo', base64Url);
        showAlert({ title: '¡Foto actualizada! 📸', message: 'Tu foto de perfil se ha guardado correctamente.' });
      }
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo guardar la imagen: ' + e.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      showAlert({ title: 'Error ❌', message: 'El nombre completo no puede estar vacío.' });
      return;
    }

    setProfileLoading(true);
    try {
      // 1. Update auth user metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (authErr) throw authErr;

      // 2. Update profiles table
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user?.id);
      if (dbErr) throw dbErr;

      showAlert({ title: '¡Éxito! ✨', message: 'Tu nombre se ha actualizado correctamente.' });
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo guardar el perfil: ' + e.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      showAlert({ title: 'Error ❌', message: 'Por favor completa ambos campos de contraseña.' });
      return;
    }

    if (password.length < 6) {
      showAlert({ title: 'Error ❌', message: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (password !== confirmPassword) {
      showAlert({ title: 'Error ❌', message: 'Las contraseñas no coinciden.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      if (error) throw error;

      setPassword('');
      setConfirmPassword('');
      showAlert({ title: '¡Éxito! 🔒', message: 'Tu contraseña ha sido cambiada correctamente.' });
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo actualizar la contraseña: ' + e.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarBtn}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.avatarPlaceholderText, { color: colors.primary }]}>
                    {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.editBadgeText}>📸</Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
              Toca para cambiar tu foto de perfil
            </Text>
          </View>

          {/* Form: General info */}
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Información Personal 🌸</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nombre Completo</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nombre Completo"
                placeholderTextColor={colors.textSecondary + '77'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Correo Electrónico</Text>
              <TextInput
                style={[styles.input, { color: colors.textSecondary, backgroundColor: colors.backgroundElement + '77', borderColor: colors.border }]}
                value={email}
                editable={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleUpdateProfile}
              disabled={profileLoading}
            >
              {profileLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Nombre</Text>}
            </TouchableOpacity>
          </View>

          {/* Form: Security password change */}
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Seguridad y Acceso 🔒</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nueva Contraseña</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textSecondary + '77'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Confirmar Contraseña</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Repite la contraseña"
                placeholderTextColor={colors.textSecondary + '77'}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleUpdatePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Actualizar Contraseña</Text>}
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 550, // Tablet-focused constraint
    gap: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarBtn: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF4B87',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD3DF',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: '800',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  editBadgeText: {
    fontSize: 16,
  },
  avatarHint: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1.5,
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
}) as any;
