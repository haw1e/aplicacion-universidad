import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
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
import AnimatedSwitch from '@/components/AnimatedSwitch';
import PinkFAB from '@/components/PinkFAB';
import { Calendar } from 'react-native-calendars';
import Svg, { Path } from 'react-native-svg';

interface Task {
  id: string;
  description: string;
  due_date: string;
  completed: boolean;
  user_id: string;
}

interface Pending {
  id: string;
  description: string;
  user_id: string;
  created_at: string;
}

interface DayGroup {
  date: string;
  tasks: Task[];
}

interface TaskSection {
  title: string;
  data: DayGroup[];
  rawCount: number;
}

export default function TasksScreen() {
  const { user } = useAuth();
  const isTablet = useIsTablet();
  const { colors } = useTheme();
  const { showConfirm, showAlert } = useAlert();

  // View state
  const [viewMode, setViewMode] = useState<'tasks' | 'pendings'>('tasks');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Lists
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendings, setPendings] = useState<Pending[]>([]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [viewMode, user]);
  
  // Collapse/Expand state for grouped tasks sections
  const [collapsedMonths, setCollapsedMonths] = useState<{ [key: string]: boolean }>({});

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);

  // Form inputs state
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDescs, setTaskDescs] = useState<string[]>(['']);
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [pendingDesc, setPendingDesc] = useState('');
  const [pendingDescs, setPendingDescs] = useState<string[]>(['']);
  const [selectedPending, setSelectedPending] = useState<Pending | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleAddTaskDescField = () => {
    setTaskDescs([...taskDescs, '']);
  };

  const handleRemoveTaskDescField = (index: number) => {
    setTaskDescs(taskDescs.filter((_, idx) => idx !== index));
  };

  const handleAddPendingDescField = () => {
    setPendingDescs([...pendingDescs, '']);
  };

  const handleRemovePendingDescField = (index: number) => {
    setPendingDescs(pendingDescs.filter((_, idx) => idx !== index));
  };
  
  // Loader for actions
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [viewMode, user]);

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      if (viewMode === 'tasks') {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true });
        if (error) throw error;
        setTasks(data || []);
      } else {
        const { data, error } = await supabase
          .from('pendings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPendings(data || []);
      }
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudieron cargar los datos: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  // Convert month key to friendly Spanish title
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

  // Group tasks by month, keeping track of collapsed states
  const getGroupedTasks = (): TaskSection[] => {
    const sorted = [...tasks].sort((a, b) => a.due_date.localeCompare(b.due_date));
    const groups: { [key: string]: Task[] } = {};

    sorted.forEach(task => {
      const monthTitle = getMonthName(task.due_date);
      if (!groups[monthTitle]) {
        groups[monthTitle] = [];
      }
      groups[monthTitle].push(task);
    });

    return Object.keys(groups).map(monthTitle => {
      const tasksInMonth = groups[monthTitle];
      
      // Group tasks in this month by due_date
      const dayGroupsMap: { [key: string]: Task[] } = {};
      tasksInMonth.forEach(task => {
        if (!dayGroupsMap[task.due_date]) {
          dayGroupsMap[task.due_date] = [];
        }
        dayGroupsMap[task.due_date].push(task);
      });

      // Sort dates and form DayGroup objects
      const dayGroups: DayGroup[] = Object.keys(dayGroupsMap)
        .sort((a, b) => a.localeCompare(b))
        .map(date => ({
          date,
          tasks: dayGroupsMap[date],
        }));

      return {
        title: monthTitle,
        data: collapsedMonths[monthTitle] ? [] : dayGroups,
        rawCount: tasksInMonth.length,
      };
    });
  };

  const toggleMonthCollapse = (monthTitle: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthTitle]: !prev[monthTitle],
    }));
  };

  // Toggle completed state
  const toggleTaskCompletion = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', task.id);
      
      if (error) throw error;
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo actualizar la tarea: ' + e.message });
    }
  };

  // Create Task
  const handleCreateTask = async () => {
    if (!taskDate) {
      showAlert({ title: 'Error ❌', message: 'Selecciona una fecha.' });
      return;
    }
    const filteredDescs = taskDescs.map(d => d.trim()).filter(Boolean);
    if (filteredDescs.length === 0) {
      showAlert({ title: 'Error ❌', message: 'Ingresa al menos una descripción.' });
      return;
    }
    setActionLoading(true);
    try {
      const insertData = filteredDescs.map(desc => ({
        description: desc,
        due_date: taskDate,
        completed: false,
        user_id: user?.id
      }));

      const { error } = await supabase
        .from('tasks')
        .insert(insertData);
      
      if (error) throw error;
      setIsTaskModalOpen(false);
      setTaskDescs(['']);
      fetchData();
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo guardar la tarea: ' + e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Create Pending
  const handleCreatePending = async () => {
    const filteredDescs = pendingDescs.map(d => d.trim()).filter(Boolean);
    if (filteredDescs.length === 0) {
      showAlert({ title: 'Error ❌', message: 'Ingresa al menos una descripción.' });
      return;
    }
    setActionLoading(true);
    try {
      const insertData = filteredDescs.map(desc => ({
        description: desc,
        user_id: user?.id
      }));

      const { error } = await supabase
        .from('pendings')
        .insert(insertData);
      
      if (error) throw error;
      setIsPendingModalOpen(false);
      setPendingDescs(['']);
      fetchData();
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo guardar el pendiente: ' + e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Task
  const handleEditTask = async () => {
    if (!selectedTask || !taskDesc.trim() || !taskDate) {
      showAlert({ title: 'Error ❌', message: 'Completa los campos.' });
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ description: taskDesc.trim(), due_date: taskDate })
        .eq('id', selectedTask.id);
      
      if (error) throw error;
      setIsEditTaskModalOpen(false);
      setSelectedTask(null);
      setTaskDesc('');
      fetchData();
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo editar la tarea: ' + e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    showConfirm({
      title: 'Eliminar Tarea 🗑️',
      message: '¿Estás seguro de que quieres eliminar esta tarea?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) throw error;
          fetchData();
        } catch (e: any) {
          showAlert({ title: 'Error ❌', message: 'No se pudo eliminar la tarea: ' + e.message });
        }
      },
    });
  };

  // Delete Pending
  const handleDeletePending = async (pendingId: string) => {
    showConfirm({
      title: 'Eliminar Pendiente 🗑️',
      message: '¿Estás seguro de que deseas eliminar este pendiente?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('pendings').delete().eq('id', pendingId);
          if (error) throw error;
          fetchData();
        } catch (e: any) {
          showAlert({ title: 'Error ❌', message: 'No se pudo eliminar el pendiente: ' + e.message });
        }
      },
    });
  };

  // Convert Pending to Task
  const handleConvertPending = async () => {
    if (!selectedPending || !taskDesc.trim() || !taskDate) {
      showAlert({ title: 'Error ❌', message: 'Completa la descripción y selecciona la fecha.' });
      return;
    }
    setActionLoading(true);
    try {
      const { error: taskErr } = await supabase
        .from('tasks')
        .insert([{ description: taskDesc.trim(), due_date: taskDate, completed: false, user_id: user?.id }]);
      if (taskErr) throw taskErr;

      const { error: pendingErr } = await supabase
        .from('pendings')
        .delete()
        .eq('id', selectedPending.id);
      if (pendingErr) throw pendingErr;

      setIsConvertModalOpen(false);
      setSelectedPending(null);
      setTaskDesc('');
      fetchData();
      showAlert({ title: '¡Convertido! 🎉', message: 'El pendiente se ha convertido en tarea.' });
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'Ocurrió un error al convertir: ' + e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Friendly date formatting
  const formatFriendlyDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderTaskItem = ({ item }: { item: DayGroup }) => {
    return (
      <View style={[styles.dayCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <View style={[styles.dayHeader, { borderBottomColor: colors.border + '44' }]}>
          <Text style={[styles.dayHeaderText, { color: colors.primary }]}>
            📅 {formatFriendlyDate(item.date)}
          </Text>
        </View>
        <View style={styles.dayTasksContainer}>
          {item.tasks.map((task, idx) => (
            <View
              key={task.id}
              style={[
                styles.taskRow,
                idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border + '22', marginTop: 12, paddingTop: 12 }
              ]}
            >
              <TouchableOpacity
                style={styles.checkboxWrapper}
                onPress={() => toggleTaskCompletion(task)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: colors.primary,
                      backgroundColor: task.completed ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {task.completed && (
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                      <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#FFF" />
                    </Svg>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.itemContent}>
                <Text
                  style={[
                    styles.itemDesc,
                    {
                      color: task.completed ? colors.textSecondary : colors.text,
                      textDecorationLine: task.completed ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {task.description}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionIconBtn, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => {
                    setSelectedTask(task);
                    setTaskDesc(task.description);
                    setTaskDate(task.due_date);
                    setIsEditTaskModalOpen(true);
                  }}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill={colors.text} />
                  </Svg>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionIconBtn, { backgroundColor: colors.error + '18' }]}
                  onPress={() => handleDeleteTask(task.id)}
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
    );
  };

  const renderPendingItem = ({ item }: { item: Pending }) => {
    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        onPress={() => {
          setSelectedPending(item);
          setTaskDesc(item.description);
          setIsConvertModalOpen(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemDesc, { color: colors.text }]}>{item.description}</Text>
          <Text style={[styles.itemSubText, { color: colors.textSecondary }]}>
            Convertir a tarea (toca aquí) ⚡
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: colors.error + '18' }]}
          onPress={() => handleDeletePending(item.id)}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill={colors.error} />
          </Svg>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title, rawCount } }: { section: TaskSection }) => {
    const isCollapsed = collapsedMonths[title] || false;
    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleMonthCollapse(title)}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
        <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
          {rawCount} {rawCount === 1 ? 'tarea' : 'tareas'} {isCollapsed ? ' ➕' : ' ➖'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Switch Toggle */}
      <AnimatedSwitch value={viewMode} onChange={setViewMode} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : viewMode === 'tasks' ? (
        /* SectionList grouped by Month with Collapse capabilities */
        <SectionList
          sections={getGroupedTasks()}
          keyExtractor={item => item.date}
          renderItem={renderTaskItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={[
            styles.listContainer,
            isTablet && { alignSelf: 'center', width: '100%', maxWidth: 700 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tienes tareas programadas. 💕
              </Text>
            </View>
          }
        />
      ) : (
        /* FlatList for Pendientes */
        <FlatList
          data={pendings}
          keyExtractor={item => item.id}
          renderItem={renderPendingItem}
          contentContainerStyle={[
            styles.listContainer,
            isTablet && { alignSelf: 'center', width: '100%', maxWidth: 700 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tienes pendientes guardados. 🌸
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <PinkFAB
        type={viewMode === 'tasks' ? 'heart' : 'star'}
        onPress={() => (viewMode === 'tasks' ? setIsTaskModalOpen(true) : setIsPendingModalOpen(true))}
      />

      {/* Modal: Create Task */}
      <Modal visible={isTaskModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Tarea ❤️</Text>
            <Text style={[styles.subLabel, { color: colors.text, marginTop: 0 }]}>Actividades / Descripciones:</Text>
            <ScrollView style={{ maxHeight: 130, marginBottom: 8 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
              <View style={{ gap: 8 }}>
                {taskDescs.map((desc, index) => (
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
                      placeholder={`Ej. Estudiar Álgebra #${index + 1}`}
                      placeholderTextColor={colors.textSecondary + '77'}
                      value={desc}
                      onChangeText={(text) => {
                        const newDescs = [...taskDescs];
                        newDescs[index] = text;
                        setTaskDescs(newDescs);
                      }}
                    />
                    {taskDescs.length > 1 && (
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
                        onPress={() => handleRemoveTaskDescField(index)}
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
              onPress={handleAddTaskDescField}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Añadir descripción</Text>
            </TouchableOpacity>

            <Text style={[styles.subLabel, { color: colors.text }]}>Seleccionar Fecha:</Text>
            <View style={styles.calendarContainer}>
              <Calendar
                current={taskDate}
                onDayPress={day => setTaskDate(day.dateString)}
                markedDates={{
                  [taskDate]: { selected: true, selectedColor: colors.primary },
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
                  setIsTaskModalOpen(false);
                  setTaskDescs(['']);
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateTask}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnTextPrimary}>Crear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Create Pending */}
      <Modal visible={isPendingModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border, maxWidth: 450 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo Pendiente ⭐️</Text>
            <Text style={[styles.subLabel, { color: colors.text, marginTop: 0 }]}>Pendientes / Descripciones:</Text>
            <ScrollView style={{ maxHeight: 130, marginBottom: 8 }} showsVerticalScrollIndicator={true}>
              <View style={{ gap: 8 }}>
                {pendingDescs.map((desc, index) => (
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
                      placeholder={`Ej. Comprar cuaderno #${index + 1}`}
                      placeholderTextColor={colors.textSecondary + '77'}
                      value={desc}
                      onChangeText={(text) => {
                        const newDescs = [...pendingDescs];
                        newDescs[index] = text;
                        setPendingDescs(newDescs);
                      }}
                    />
                    {pendingDescs.length > 1 && (
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
                        onPress={() => handleRemovePendingDescField(index)}
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
              onPress={handleAddPendingDescField}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Añadir pendiente</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.backgroundElement }]}
                onPress={() => {
                  setIsPendingModalOpen(false);
                  setPendingDescs(['']);
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreatePending}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnTextPrimary}>Agregar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Convert Pending to Task */}
      <Modal visible={isConvertModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Convertir a Tarea ⚡️</Text>
            
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
              placeholder="Descripción de la tarea..."
              placeholderTextColor={colors.textSecondary + '77'}
              value={taskDesc}
              onChangeText={setTaskDesc}
            />

            <Text style={[styles.subLabel, { color: colors.text }]}>Seleccionar Fecha Límite:</Text>
            <View style={styles.calendarContainer}>
              <Calendar
                current={taskDate}
                onDayPress={day => setTaskDate(day.dateString)}
                markedDates={{
                  [taskDate]: { selected: true, selectedColor: colors.primary },
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
                  setIsConvertModalOpen(false);
                  setSelectedPending(null);
                  setTaskDesc('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleConvertPending}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnTextPrimary}>Confirmar Tarea</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Edit Task */}
      <Modal visible={isEditTaskModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Tarea ✏️</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
              placeholder="Descripción..."
              placeholderTextColor={colors.textSecondary + '77'}
              value={taskDesc}
              onChangeText={setTaskDesc}
            />

            <Text style={[styles.subLabel, { color: colors.text }]}>Fecha:</Text>
            <View style={styles.calendarContainer}>
              <Calendar
                current={taskDate}
                onDayPress={day => setTaskDate(day.dateString)}
                markedDates={{
                  [taskDate]: { selected: true, selectedColor: colors.primary },
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
                  setIsEditTaskModalOpen(false);
                  setSelectedTask(null);
                  setTaskDesc('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleEditTask}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1.5,
    marginRight: 12,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
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
  checkboxWrapper: {
    paddingRight: 16,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemDesc: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  itemDate: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemSubText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
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
    maxWidth: 500, // Tablet-focused constraint
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
