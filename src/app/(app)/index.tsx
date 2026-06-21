import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { useIsTablet } from '@/hooks/useIsTablet';
import { appStorage } from '@/lib/storage';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const isTablet = useIsTablet();
  const { colors, companionPet, setCompanionPet } = useTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // State
  const [profileName, setProfileName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [quickPendingDesc, setQuickPendingDesc] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [savingPending, setSavingPending] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState({
    tasks: 0,
    pendings: 0,
    evaluations: 0,
    exams: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Reload data every time this screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // Quick local load
        loadLocalProfilePhoto();
        if (user.user_metadata?.full_name) {
          setProfileName(user.user_metadata.full_name);
        }
        // DB load
        fetchProfile();
        fetchStats();
      }
    }, [user])
  );

  const loadLocalProfilePhoto = async () => {
    try {
      const storedPhoto = await appStorage.getItem('profile_photo');
      if (storedPhoto) {
        setPhotoUri(storedPhoto);
      } else {
        setPhotoUri(null);
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
        setProfileName(data.full_name);
        if (data.avatar_url) {
          setPhotoUri(data.avatar_url);
          // Sync with local storage
          await appStorage.setItem('profile_photo', data.avatar_url);
        }
      }
    } catch (e) {
      console.log('Error fetching profile:', e);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      // Query counts in parallel
      const [tasksRes, pendingsRes, evaluationsRes, examsRes] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('pendings').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('evaluations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('exams').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setStats({
        tasks: tasksRes.count || 0,
        pendings: pendingsRes.count || 0,
        evaluations: evaluationsRes.count || 0,
        exams: examsRes.count || 0,
      });
    } catch (e) {
      console.log('Error fetching stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveQuickPending = async () => {
    if (!quickPendingDesc.trim()) {
      showAlert({ title: 'Error ❌', message: 'Por favor ingresa una descripción.' });
      return;
    }

    setSavingPending(true);
    try {
      const { error } = await supabase
        .from('pendings')
        .insert([{ description: quickPendingDesc.trim(), user_id: user?.id }]);

      if (error) throw error;

      setIsModalOpen(false);
      setQuickPendingDesc('');
      fetchStats(); // Update stats
      showAlert({ title: '¡Éxito! 🎉', message: 'Pendiente rápido guardado correctamente.' });
    } catch (error: any) {
      showAlert({ title: 'Error ❌', message: 'Error al guardar: ' + error.message });
    } finally {
      setSavingPending(false);
    }
  };

  const renderNavCard = (
    title: string,
    subtitle: string,
    route: '/tasks' | '/evaluations' | '/exams' | '/calendar',
    iconPath: string,
    badgeValue: number
  ) => {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        onPress={() => router.push(route)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.backgroundElement }]}>
            <Svg width={28} height={28} viewBox="0 0 24 24">
              <Path d={iconPath} fill={colors.primary} />
            </Svg>
          </View>
          {badgeValue > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{badgeValue}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </TouchableOpacity>
    );
  };

  const renderPetOption = (petType: string, label: string, desc: string, iconOrImage: any, isImage = false) => {
    const isSelected = companionPet === petType;
    return (
      <TouchableOpacity
        key={petType}
        style={[
          styles.petOptionCard,
          {
            backgroundColor: isSelected ? colors.primary + '10' : colors.backgroundCard,
            borderColor: isSelected ? colors.primary : colors.border,
          }
        ]}
        onPress={() => setCompanionPet(petType)}
        activeOpacity={0.7}
      >
        <View style={styles.petOptionLeft}>
          {isImage ? (
            <Image source={iconOrImage} style={styles.petOptionImage} resizeMode="contain" />
          ) : (
            <Text style={styles.petOptionEmoji}>{iconOrImage}</Text>
          )}
          <View style={styles.petOptionTextContainer}>
            <Text style={[styles.petOptionTitle, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.petOptionDesc, { color: colors.textSecondary }]}>{desc}</Text>
          </View>
        </View>

        {/* Checkmark or radio */}
        <View style={[styles.petRadioCircle, { borderColor: isSelected ? colors.primary : colors.textSecondary }]}>
          {isSelected && <View style={[styles.petRadioDot, { backgroundColor: colors.primary }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  // SVGs for nav cards
  const taskIcon = 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z';
  const evalIcon = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';
  const examIcon = 'M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5.18 11.5L12 15.22l6.82-3.72L12 7.78z';
  const calIcon = 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-5-7h-5v5h5v-5z';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top > 0 ? insets.top + 8 : 16,
          height: insets.top > 0 ? 60 + insets.top : 85,
          borderBottomColor: colors.border,
          backgroundColor: colors.backgroundCard,
        }
      ]}>
        <View>
          <Text style={[styles.welcomeText, { color: colors.text }]}>¡Hola, {profileName || 'Estudiante'}! 🌸</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Toolbar: Settings, Profile and Logout */}
        <View style={styles.headerToolbar}>
          {screenWidth < 450 ? (
            /* Hamburger Menu Button */
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.backgroundElement }]}
              onPress={() => setIsHeaderMenuOpen(true)}
              activeOpacity={0.7}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill={colors.primary} />
              </Svg>
            </TouchableOpacity>
          ) : (
            /* Traditional Horizontal Buttons */
            <>
              {/* Companion Pet Selector Button */}
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: colors.backgroundElement, marginRight: 8 }]}
                onPress={() => setIsPetModalOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>🐾</Text>
              </TouchableOpacity>

              {/* Settings button */}
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: colors.backgroundElement, marginRight: 8 }]}
                onPress={() => router.push('/settings')}
                activeOpacity={0.7}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill={colors.primary} />
                </Svg>
              </TouchableOpacity>

              {/* Profile photo avatar button */}
              <TouchableOpacity
                style={styles.headerAvatarBtn}
                onPress={() => router.push('/profile')}
                activeOpacity={0.8}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.headerAvatar} />
                ) : (
                  <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.headerAvatarInitial, { color: colors.primary }]}>
                      {profileName ? profileName.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={isTablet ? styles.tabletContainer : styles.phoneContainer}>
          
          {/* Left panel (tablet info / stats summary) */}
          <View style={isTablet ? styles.leftPanel : styles.mobileHeaderPanel}>
            <View style={[styles.statsBox, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumen 📊</Text>
              
              {loadingStats ? (
                <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
              ) : (
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{stats.tasks}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tareas</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.secondary }]}>{stats.pendings}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendientes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{stats.evaluations}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Evaluaciones</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{stats.exams}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exámenes</Text>
                  </View>
                </View>
              )}

              {/* Quick pending trigger button */}
              <TouchableOpacity
                style={[styles.quickPendingBtn, { backgroundColor: colors.primary }]}
                onPress={() => setIsModalOpen(true)}
              >
                <Text style={styles.quickPendingBtnText}>⚡ Pendiente Rápido</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right panel (navigation grid) */}
          <View style={isTablet ? styles.rightPanel : styles.navPanel}>
            <View style={styles.grid}>
              {renderNavCard('Tareas y Pendientes', 'Organiza tus quehaceres', '/tasks', taskIcon, stats.tasks + stats.pendings)}
              {renderNavCard('Evaluaciones', 'Próximas entregas y controles', '/evaluations', evalIcon, stats.evaluations)}
              {renderNavCard('Exámenes', 'Pruebas finales y exámenes', '/exams', examIcon, stats.exams)}
              {renderNavCard('Calendario', 'Ver eventos cronológicamente', '/calendar', calIcon, 0)}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Hamburger Dropdown Modal */}
      <Modal
        visible={isHeaderMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsHeaderMenuOpen(false)}
      >
        <TouchableOpacity 
          style={styles.menuModalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsHeaderMenuOpen(false)}
        >
          <View style={[
            styles.menuModalContent, 
            { 
              backgroundColor: colors.backgroundCard, 
              borderColor: colors.border, 
              top: insets.top > 0 ? insets.top + 70 : 80 
            }
          ]}>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => { setIsHeaderMenuOpen(false); setIsPetModalOpen(true); }}
            >
              <Text style={styles.menuItemEmoji}>🐾</Text>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Elegir Mascota</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => { setIsHeaderMenuOpen(false); router.push('/settings'); }}
            >
              <Text style={styles.menuItemEmoji}>⚙️</Text>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Configuraciones</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { setIsHeaderMenuOpen(false); router.push('/profile'); }}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.menuItemAvatar} />
              ) : (
                <View style={[styles.menuItemAvatarPlaceholder, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.menuItemAvatarInitial, { color: colors.primary }]}>
                    {profileName ? profileName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <Text style={[styles.menuItemText, { color: colors.text, marginLeft: 8 }]}>Mi Perfil</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Styled Modal for Quick Pending */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setIsModalOpen(false);
            setQuickPendingDesc('');
          }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {}} // prevent click-through
            style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Nuevo Pendiente ⚡</Text>
              <TouchableOpacity 
                style={[styles.modalCloseBtn, { backgroundColor: colors.backgroundElement }]} 
                onPress={() => {
                  setIsModalOpen(false);
                  setQuickPendingDesc('');
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Ej. Estudiar capítulo 3 de anatomía..."
              placeholderTextColor={colors.textSecondary + '88'}
              multiline
              numberOfLines={4}
              value={quickPendingDesc}
              onChangeText={setQuickPendingDesc}
              maxLength={200}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.backgroundElement }]}
                onPress={() => {
                  setIsModalOpen(false);
                  setQuickPendingDesc('');
                }}
                disabled={savingPending}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveQuickPending}
                disabled={savingPending}
              >
                {savingPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalBtnTextPrimary}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Companion Pet Selector Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isPetModalOpen}
        onRequestClose={() => setIsPetModalOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsPetModalOpen(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {}} // prevent click-through
            style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border, maxWidth: 500 }]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Elegir Mascota 🐾</Text>
              <TouchableOpacity 
                style={[styles.modalCloseBtn, { backgroundColor: colors.backgroundElement }]} 
                onPress={() => setIsPetModalOpen(false)}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
              Selecciona un tierno personaje animado que camine por tu pantalla mientras organizas tus estudios.
            </Text>

            <ScrollView style={{ maxHeight: 380, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                {renderPetOption('none', 'Ninguno ❌', 'Sin mascota en pantalla.', '❌')}
                {renderPetOption('poro', 'Poro ☁️', 'Un esponjoso Poro de League of Legends.', require('../../../assets/images/poro.jpg'), true)}
                {renderPetOption('kirby', 'Kirby 🌸', '¡El tierno Kirby listo para absorber apuntes!', require('../../../assets/images/kirby.jpg'), true)}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary, width: '100%' }]}
              onPress={() => setIsPetModalOpen(false)}
            >
              <Text style={styles.modalBtnTextPrimary}>Cerrar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderBottomWidth: 1.5,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FF4B87',
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFD3DF',
  },
  headerAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  logoutBtn: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  phoneContainer: {
    flexDirection: 'column',
    gap: 20,
  },
  tabletContainer: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  leftPanel: {
    flex: 1,
    maxWidth: 320,
  },
  rightPanel: {
    flex: 2,
  },
  mobileHeaderPanel: {
    width: '100%',
  },
  navPanel: {
    width: '100%',
  },
  statsBox: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  quickPendingBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPendingBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    flex: 1,
    minWidth: 260,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 450,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    borderWidth: 1.5,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnTextPrimary: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  petOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
  },
  petOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  petOptionEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  petOptionImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  petOptionTextContainer: {
    flex: 1,
    gap: 2,
  },
  petOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  petOptionDesc: {
    fontSize: 11,
    lineHeight: 14,
  },
  petRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  petRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuModalContent: {
    position: 'absolute',
    right: 24,
    width: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemEmoji: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
  menuItemAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF4B87',
  },
  menuItemAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD3DF',
  },
  menuItemAvatarInitial: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
