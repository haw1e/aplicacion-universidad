import React, { createContext, useContext, useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface AlertOptions {
  title: string;
  message: string;
  buttonText?: string;
  onClose?: () => void;
}

interface AlertContextProps {
  showConfirm: (options: ConfirmOptions) => void;
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  const [visible, setVisible] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [confirmText, setConfirmText] = useState('Confirmar');
  const [cancelText, setCancelText] = useState('Cancelar');
  const [alertType, setAlertType] = useState<'danger' | 'warning' | 'success' | 'info'>('info');

  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);
  const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(null);

  const showConfirm = (options: ConfirmOptions) => {
    setTitle(options.title);
    setMessage(options.message);
    setConfirmText(options.confirmText || 'Confirmar');
    setCancelText(options.cancelText || 'Cancelar');
    setAlertType(options.type || 'info');
    setOnConfirmCallback(() => () => {
      setVisible(false);
      options.onConfirm();
    });
    setOnCancelCallback(() => () => {
      setVisible(false);
      if (options.onCancel) options.onCancel();
    });
    setIsConfirm(true);
    setVisible(true);
  };

  const showAlert = (options: AlertOptions) => {
    setTitle(options.title);
    setMessage(options.message);
    setConfirmText(options.buttonText || 'Aceptar');
    setAlertType('info');
    setOnConfirmCallback(() => () => {
      setVisible(false);
      if (options.onClose) options.onClose();
    });
    setOnCancelCallback(null);
    setIsConfirm(false);
    setVisible(true);
  };

  const getConfirmButtonColor = () => {
    switch (alertType) {
      case 'danger':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'success':
        return colors.success;
      default:
        return colors.primary;
    }
  };

  return (
    <AlertContext.Provider value={{ showConfirm, showAlert }}>
      {children}
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            {/* Header / Title */}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            
            {/* Message */}
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            
            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              {isConfirm && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => {
                    if (onCancelCallback) onCancelCallback();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, { color: colors.text }]}>{cancelText}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.confirmButton, 
                  { backgroundColor: getConfirmButtonColor() },
                  !isConfirm && { flex: 1, minWidth: 150 }
                ]}
                onPress={() => {
                  if (onConfirmCallback) onConfirmCallback();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, styles.confirmButtonText]}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cancelButton: {
    borderWidth: 0,
  },
  confirmButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
});
