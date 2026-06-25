import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
  RefreshControl,
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

interface Exam {
  id: string;
  description: string;
  date: string;
  user_id: string;
}

interface DayGroupExam {
  date: string;
  exams: Exam[];
}

interface GroupedSection {
  title: string;
  data: DayGroupExam[];
}

export default function ExamsScreen() {
  const { user } = useAuth();
  const isTablet = useIsTablet();
  const { colors } = useTheme();
  const { showConfirm, showAlert } = useAlert();

  const formatModalDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = dateObj.getDay();
      const dayOfMonth = dateObj.getDate();
      const monthIndex = dateObj.getMonth();

      const weekDays = [
        'Domingo',
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado'
      ];
      
      const months = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre'
      ];

      return `${weekDays[dayOfWeek]}, ${dayOfMonth} ${months[monthIndex]}`;
    } catch (e) {
      return dateStr;
    }
  };

  // State
  const [exams, setExams] = useState<GroupedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExams(true);
    setRefreshing(false);
  }, [user]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [descriptions, setDescriptions] = useState<string[]>(['']);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddDescriptionField = () => {
    setDescriptions([...descriptions, '']);
  };

  const handleRemoveDescriptionField = (index: number) => {
    setDescriptions(descriptions.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    fetchExams();
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

  // Group and sort exams by month
  const processAndGroupExams = (rawExams: Exam[]) => {
    // Sort raw elements chronologically first
    const sorted = [...rawExams].sort((a, b) => a.date.localeCompare(b.date));

    const monthGroups: { [key: string]: Exam[] } = {};
    sorted.forEach(item => {
      const monthTitle = getMonthName(item.date);
      if (!monthGroups[monthTitle]) {
        monthGroups[monthTitle] = [];
      }
      monthGroups[monthTitle].push(item);
    });

    return Object.keys(monthGroups).map(monthTitle => {
      const examsInMonth = monthGroups[monthTitle];
      
      // Group exams in this month by date
      const dayGroupsMap: { [key: string]: Exam[] } = {};
      examsInMonth.forEach(item => {
        if (!dayGroupsMap[item.date]) {
          dayGroupsMap[item.date] = [];
        }
        dayGroupsMap[item.date].push(item);
      });

      // Sort dates and form DayGroupExam objects
      const dayGroups: DayGroupExam[] = Object.keys(dayGroupsMap)
        .sort((a, b) => a.localeCompare(b))
        .map(date => ({
          date,
          exams: dayGroupsMap[date],
        }));

      return {
        title: monthTitle,
        data: dayGroups,
      };
    });
  };

  const fetchExams = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Map exam_date from database to date property for the UI
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        date: item.exam_date || item.date,
        user_id: item.user_id,
      }));

      setExams(processAndGroupExams(mappedData));
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudieron cargar los exámenes: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!date) {
      showAlert({ title: 'Error ❌', message: 'Por favor selecciona una fecha.' });
      return;
    }
    const filteredDescs = descriptions.map(d => d.trim()).filter(Boolean);
    if (filteredDescs.length === 0) {
      showAlert({ title: 'Error ❌', message: 'Por favor ingresa al menos una descripción.' });
      return;
    }
    setActionLoading(true);
    try {
      const insertData = filteredDescs.map(desc => ({
        description: desc,
        exam_date: date,
        user_id: user?.id
      }));

      const { data, error } = await supabase
        .from('exams')
        .insert(insertData)
        .select();

      if (error) throw error;

      if (data && Array.isArray(data)) {
        for (const item of data) {
          await scheduleItemNotifications(item.id, item.description, item.exam_date || item.date, 'Examen');
        }
      }

      setIsCreateModalOpen(false);
      setDescriptions(['']);
      fetchExams();
      showAlert({ title: '¡Creado! 🎓', message: 'Los exámenes se han guardado correctamente.' });
    } catch (e: any) {
      console.error('Error al guardar examen:', e);
      showAlert({ title: 'Error ❌', message: 'No se pudo guardar el examen: ' + e.message + (e.details ? '\n' + e.details : '') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedExam || !description.trim() || !date) {
      showAlert({ title: 'Error ❌', message: 'Por favor ingresa todos los campos.' });
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({ description: description.trim(), exam_date: date })
        .eq('id', selectedExam.id);

      if (error) throw error;

      await scheduleItemNotifications(selectedExam.id, description.trim(), date, 'Examen');

      setIsEditModalOpen(false);
      setSelectedExam(null);
      setDescription('');
      fetchExams();
      showAlert({ title: '¡Guardado! 📝', message: 'Cambios guardados.' });
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudieron guardar los cambios: ' + e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirm({
      title: 'Eliminar Examen 🗑️',
      message: '¿Estás seguro de que deseas eliminar este examen?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('exams').delete().eq('id', id);
          if (error) throw error;

          await cancelItemNotifications(id);

          fetchExams();
        } catch (e: any) {
          showAlert({ title: 'Error ❌', message: 'No se pudo eliminar el examen: ' + e.message });
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
          sections={exams}
          keyExtractor={item => item.date}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.primary }]}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={[styles.dayCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={[styles.dayHeader, { borderBottomColor: colors.border + '44' }]}>
                <Text style={[styles.dayHeaderText, { color: colors.primary }]}>
                  📅 {formatModalDate(item.date)}
                </Text>
              </View>
              <View style={styles.dayTasksContainer}>
                {item.exams.map((examItem, idx) => (
                  <View
                    key={examItem.id}
                    style={[
                      styles.taskRow,
                      idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border + '22', marginTop: 12, paddingTop: 12 }
                    ]}
                  >
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemDesc, { color: colors.text }]}>{examItem.description}</Text>
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.backgroundElement }]}
                        onPress={() => {
                          setSelectedExam(examItem);
                          setDescription(examItem.description);
                          setDate(examItem.date);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                          <Path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill={colors.text} />
                        </Svg>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.error + '18' }]}
                        onPress={() => handleDelete(examItem.id)}
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
                No tienes exámenes programados. 🎓
              </Text>
            </View>
          }
        />
      )}

      {/* FAB - Star icon to create exam */}
      <PinkFAB type="star" onPress={() => setIsCreateModalOpen(true)} />

      {/* Modal: New Exam */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo Examen 🎓</Text>
            
            <Text style={[styles.subLabel, { color: colors.text, marginTop: 0 }]}>Actividades / Descripciones:</Text>
            <ScrollView style={{ maxHeight: 130, marginBottom: 8 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
              <View style={{ gap: 8 }}>
                {descriptions.map((desc, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      style={[
                        styles.modalInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.backgroundElement,
                          borderColor: colors.border,
                          flex: 1,
                          marginBottom: 0,
                          height: 44,
                          paddingHorizontal: 12
                        }
                      ]}
                      placeholder={`Ej. Examen Final (Cálculo) #${index + 1}`}
                      placeholderTextColor={colors.textSecondary + '77'}
                      value={desc}
                      onChangeText={(text) => {
                        const newDescs = [...descriptions];
                        newDescs[index] = text;
                        setDescriptions(newDescs);
                      }}
                    />
                    {descriptions.length > 1 && (
                      <TouchableOpacity 
                        style={{ 
                          width: 44, 
                          height: 44, 
                          borderRadius: 14, 
                          backgroundColor: colors.backgroundElement, 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          borderWidth: 1.5,
                          borderColor: colors.border
                        }}
                        onPress={() => handleRemoveDescriptionField(index)}
                      >
                        <Text style={{ color: colors.error, fontSize: 16, fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: 6, 
                alignSelf: 'flex-start', 
                marginBottom: 14,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: colors.backgroundElement,
                borderWidth: 1,
                borderColor: colors.border
              }}
              onPress={handleAddDescriptionField}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Añadir descripción</Text>
            </TouchableOpacity>

            <Text style={[styles.subLabel, { color: colors.text }]}>Fecha del Examen: {formatModalDate(date)}</Text>
            <View style={styles.calendarContainer}>
              <Calendar
                current={date}
                onDayPress={day => setDate(day.dateString)}
                monthFormat={'MMMM'}
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

      {/* Modal: Edit Exam */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Examen ✏️</Text>
            
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
              placeholder="Descripción"
              placeholderTextColor={colors.textSecondary + '77'}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={[styles.subLabel, { color: colors.text }]}>Fecha: {formatModalDate(date)}</Text>
            <View style={styles.calendarContainer}>
              <Calendar
                current={date}
                onDayPress={day => setDate(day.dateString)}
                monthFormat={'MMMM'}
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
                  setSelectedExam(null);
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
