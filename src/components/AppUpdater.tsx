import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '@/context/ThemeContext';

const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/haw1e/aplicacion-universidad/main/version.json';

interface UpdateData {
  version: string;
  apkUrl: string;
  changelog: string;
}

export default function AppUpdater() {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);

  useEffect(() => {
    const checkUpdates = async () => {
      setChecking(true);
      try {
        const response = await fetch(VERSION_CHECK_URL);
        if (!response.ok) {
          throw new Error('No se pudo obtener el archivo de versión');
        }
        
        const data: UpdateData = await response.json();
        const currentVersion = Constants.expoConfig?.version || '1.0.0';

        // simple version mismatch check (can be improved to semver comparison if needed)
        if (data.version && data.version !== currentVersion) {
          setUpdateData(data);
          setModalVisible(true);
        }
      } catch (error) {
        console.log('Error al buscar actualizaciones en GitHub:', error);
      } finally {
        setChecking(false);
      }
    };

    checkUpdates();
  }, []);

  const handleUpdate = () => {
    if (updateData?.apkUrl) {
      Linking.openURL(updateData.apkUrl).catch(err => {
        console.log('Error al abrir la URL de descarga:', err);
      });
      setModalVisible(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          
          {/* Header decoration */}
          <View style={[styles.glowBar, { backgroundColor: colors.primary }]} />
          
          <Text style={[styles.title, { color: colors.primary }]}>¡Nueva actualización! 🚀</Text>
          <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>
            Versión actual: {Constants.expoConfig?.version || '1.0.0'}  ➔  Nueva: {updateData?.version}
          </Text>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Changelog Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Novedades de esta versión:</Text>
          <View style={[styles.changelogBox, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.changelogText, { color: colors.text }]}>
              {updateData?.changelog || '• Mejoras generales en el rendimiento y estabilidad.'}
            </Text>
          </View>

          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            Al presionar actualizar, se abrirá el navegador para descargar el nuevo archivo instalador APK.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.btnCancel, { borderColor: colors.border }]} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.btnTextCancel, { color: colors.textSecondary }]}>Más tarde</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnConfirm, { backgroundColor: colors.primary }]} 
              onPress={handleUpdate}
            >
              <Text style={styles.btnTextConfirm}>Actualizar Ahora</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  glowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  versionLabel: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  separator: {
    height: 1.5,
    width: '100%',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changelogBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    maxHeight: 120,
  },
  changelogText: {
    fontSize: 13,
    lineHeight: 18,
  },
  instruction: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirm: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnTextCancel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnTextConfirm: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
