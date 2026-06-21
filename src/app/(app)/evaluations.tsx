import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SectionList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { useIsTablet } from '@/hooks/useIsTablet';
import PinkFAB from '@/components/PinkFAB';
import { Calendar } from 'react-native-calendars';
import Svg, { Path } from 'react-native-svg';
import { scheduleItemNotifications, cancelItemNotifications } from '@/lib/notifications';

interface Evaluation {
  id: string;
  description: string;
  date: string;
  user_id: string;
}

interface DayGroupEvaluation {
  date: string;
  evaluations: Evaluation[];
}

interface GroupedSection {
  title: string;
  data: DayGroupEvaluation[];
}

export default function EvaluationsScreen() {
  const { user } = useAuth();
  const isTablet = useIsTablet();
  const { colors } = useTheme();
  const { showConfirm, showAlert } = useAlert();

  // State
  const [evaluations, setEvaluations] = useState<GroupedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchEvaluations();
  }, [user]);

  // Translate month index to Spanish name
  const getMonthName = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length < 3) return 'Otros';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    
    const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  // Group and sort evaluations by month
  const processAndGroupEvaluations = (rawEvals: Evaluation[]) => {
    // Sort raw elements chronologically first
    const sorted = [...rawEvals].sort((a, b) => a.date.localeCompare(b.date));

    const monthGroups: { [key: string]: Evaluation[] } = {};
    sorted.forEach(item => {
      const monthTitle = getMonthName(item.date);
      if (!monthGroups[monthTitle]) {
        monthGroups[monthTitle] = [];
      }
      monthGroups[monthTitle].push(item);
    });

    return Object.keys(monthGroups).map(monthTitle => {
      const evalsInMonth = monthGroups[monthTitle];
      
      // Group evals in this month by date
      const dayGroupsMap: { [key: string]: Evaluation[] } = {};
      evalsInMonth.forEach(item => {
        if (!dayGroupsMap[item.date]) {
          dayGroupsMap[item.date] = [];
        }
        dayGroupsMap[item.date].push(item);
      });

      // Sort dates and form DayGroupEvaluation objects
      const dayGroups: DayGroupEvaluation[] = Object.keys(dayGroupsMap)
        .sort((a, b) => a.localeCompare(b))
        .map(date => ({
          date,
          evaluations: dayGroupsMap[date],
        }));

      return {
        title: monthTitle,
        data: dayGroups,
      };
    });
  };

  const fetchEvaluations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Map evaluation_date from database to date property for the UI
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        date: item.evaluation_date || item.date,
        user_id: item.user_id,
      }));

      setEvaluations(processAndGroupEvaluations(mappedData));
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudieron cargar las evaluaciones: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!description.trim() || !date) {
      showAlert({ title: 'Error ❌', message: 'Por favor ingresa una descripción y selecciona una fecha.' });
      return;
    }
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .insert([{ description: description.trim(), evaluation_date: date, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await scheduleItemNotifications(data.id, data.description, data.evaluation_date || data.date, 'Evaluación');
      }

      setIsCreateModalOpen(false);
      setDescription('');
      fetchEvaluations();
      showAlert({ title: '¡Creado! 🌟', message: 'La evaluación se ha guardado correctamente.' });
    } catch (e: any) {
      console.error('Error al guardar evaluación:', e);
      showAlert({ title: 'Error ❌', message: 'No se pudo guardar la evaluación: ' + e.message + (e.details ? '\n' + e.details : '') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEval || !description.trim() || !date) {
      showAlert({ title: 'Error ❌', message: 'Por favor ingresa todos los campos.' });
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('evaluations')
        .update({ description: description.trim(), evaluation_date: date })
        .eq('id', selectedEval.id);

      if (error) throw error;

      await scheduleItemNotifications(selectedEval.id, description.trim(), date, 'Evaluación');

      setIsEditModalOpen(false);
      setSelectedEval(null);
      setDescription('');
      fetchEvaluations();
      showAlert({ title: '¡Guardado! 📝', message: 'Cambios guardados.' });
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudieron guardar los cambios: ' + e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirm({
      title: 'Eliminar Evaluación 🗑️',
      message: '¿Estás seguro de que deseas eliminar esta evaluación?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('evaluations').delete().eq('id', id);
          if (error) throw error;
          
          await cancelItemNotifications(id);

          fetchEvaluations();
        } catch (e: any) {
          showAlert({ title: 'Error ❌', message: 'No se pudo eliminar la evaluación: ' + e.message });
        }
      },
    });
  };

  // Get day number from date string
  const getDayNumber = (dateStr: string) => {
    const parts = dateStr.split('-');
    return parts.length >= 3 ? parts[2] : '';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <SectionList
          sections={evaluations}
          keyExtractor={item => item.date}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.primary }]}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={[styles.dayCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={[styles.dayHeader, { borderBottomColor: colors.border + '44' }]}>
                <Text style={[styles.dayHeaderText, { color: colors.primary }]}>
                  📅 {new Date(item.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
              <View style={styles.dayTasksContainer}>
                {item.evaluations.map((evalItem, idx) => (
                  <View
                    key={evalItem.id}
                    style={[
                      styles.taskRow,
                      idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border + '22', marginTop: 12, paddingTop: 12 }
                    ]}
                  >
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemDesc, { color: colors.text }]}>{evalItem.description}</Text>
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.backgroundElement }]}
                        onPress={() => {
                          setSelectedEval(evalItem);
                          setDescription(evalItem.description);
                          setDate(evalItem.date);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                          <Path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill={colors.text} />
                        </Svg>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.error + '18' }]}
                        onPress={() => handleDelete(evalItem.id)}
                      >
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                          <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill={colors.error} />
                        </Svg>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          contentContainerStyle={[
            styles.listContainer,
            isTablet && { alignSelf: 'center', width: '100%', maxWidth: 700 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tienes evaluaciones programadas. ⭐️
              </Text>
            </View>
          }
        />
      )}

      {/* FAB - Star icon to create evaluation */}
      <PinkFAB type="star" onPress={() => setIsCreateModalOpen(true)} />

      {/* Modal: New Evaluation */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Evaluación 🌟</Text>
            
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
              placeholder="Descripción (ej. Control 2 de Álgebra)"
              placeholderTextColor={colors.textSecondary + '77'}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={[styles.subLabel, { color: colors.text }]}>Fecha de la Evaluación:</Text>
            <View style={styles.calendarContainer}>
              <Calendar
                current={date}
                onDayPress={day => setDate(day.dateString)}
                markedDates={{
                  [date]: { selected: true, selectedColor: colors.primary },
                }}
                theme={{
                  calendarBackground: colors.backgroundCard,
                  textSectionTitleColor: colors.textSecondary,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.primary,
                  dayTextColor: colors.text,
                  textDisabledColor: colors.textSecondary + '44',
                  arrowColor: colors.primary,
                  monthTextColor: colors.text,
                }}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.backgroundElement }]}
                onPress={() => {
                  setIsCreateModalOpen(false);
                  setDescription('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnTextPrimary}>Crear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Edit Evaluation */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Evaluación ✏️</Text>
            
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
              placeholder="Descripción"
              placeholderTextColor={colors.textSecondary + '77'}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={[styles.subLabel, { color: colors.text }]}>Fecha:</Text>
            <View style={styles.calendarContainer}>
              <Calendar
                current={date}
                onDayPress={day => setDate(day.dateString)}
                markedDates={{
                  [date]: { selected: true, selectedColor: colors.primary },
                }}
                theme={{
                  calendarBackground: colors.backgroundCard,
                  textSectionTitleColor: colors.textSecondary,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.primary,
                  dayTextColor: colors.text,
                  textDisabledColor: colors.textSecondary + '44',
                  arrowColor: colors.primary,
                  monthTextColor: colors.text,
                }}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.backgroundElement }]}
                onPress={() => {
                  setIsEditModalOpen(false);
                  setSelectedEval(null);
                  setDescription('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleEdit}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnTextPrimary}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingVertical: 14,
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dayCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  dayHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayTasksContainer: {
    gap: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  dayBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dayText: {
    fontSize: 18,
    fontWeight: '800',
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemDesc: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  itemSubText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
    maxWidth: 500,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  modalInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  calendarContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFD3DF',
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
});
