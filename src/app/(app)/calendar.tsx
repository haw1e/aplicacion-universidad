import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { useIsTablet } from '@/hooks/useIsTablet';
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

export default function CalendarScreen() {
  const { user } = useAuth();
  const isTablet = useIsTablet();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { width: screenWidth } = useWindowDimensions();
  
  // Calculate responsive cell width (max 850px width container, minus calendar card paddings, divided by 7 days)
  const cellWidth = Math.floor((Math.min(screenWidth, 850) - 32) / 7);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allPendings, setAllPendings] = useState<Pending[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
  const [allExams, setAllExams] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData(true);
    setRefreshing(false);
  }, [user]);

  // Screen items filtered by selected date
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filteredPendings, setFilteredPendings] = useState<Pending[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<any[]>([]);
  const [filteredExams, setFilteredExams] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, [user]);

  useEffect(() => {
    filterDataByDate();
  }, [selectedDate, allTasks, allPendings, allEvaluations, allExams]);

  // Fetch all tasks, pendings, evaluations, and exams to display on calendar
  const fetchAllData = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const [tasksRes, pendingsRes, evalsRes, examsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('pendings').select('*').eq('user_id', user.id),
        supabase.from('evaluations').select('*').eq('user_id', user.id),
        supabase.from('exams').select('*').eq('user_id', user.id),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (pendingsRes.error) throw pendingsRes.error;
      if (evalsRes.error) throw evalsRes.error;
      if (examsRes.error) throw examsRes.error;

      setAllTasks(tasksRes.data || []);
      setAllPendings(pendingsRes.data || []);

      // Map evaluation and exam dates correctly
      const mappedEvals = (evalsRes.data || []).map((e: any) => ({
        ...e,
        date: e.evaluation_date || e.date,
      }));
      const mappedExams = (examsRes.data || []).map((ex: any) => ({
        ...ex,
        date: ex.exam_date || ex.date,
      }));

      setAllEvaluations(mappedEvals);
      setAllExams(mappedExams);
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudieron cargar los eventos del calendario: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  // Convert pending timestamp to YYYY-MM-DD in local time
  const getPendingLocalDate = (createdAtStr: string) => {
    const d = new Date(createdAtStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter local lists by selected date
  const filterDataByDate = () => {
    const matchedTasks = allTasks.filter(task => task.due_date === selectedDate);
    const matchedPendings = allPendings.filter(pending => {
      const pendingDate = getPendingLocalDate(pending.created_at);
      return pendingDate === selectedDate;
    });
    const matchedEvals = allEvaluations.filter(e => e.date === selectedDate);
    const matchedExams = allExams.filter(ex => ex.date === selectedDate);

    setFilteredTasks(matchedTasks);
    setFilteredPendings(matchedPendings);
    setFilteredEvaluations(matchedEvals);
    setFilteredExams(matchedExams);
  };

  // Toggle task completion from calendar
  const toggleTaskCompletion = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', task.id);

      if (error) throw error;
      
      // Update local state
      setAllTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
    } catch (e: any) {
      showAlert({ title: 'Error ❌', message: 'No se pudo actualizar la tarea: ' + e.message });
    }
  };

  // Build marked dates for calendar component (handles selection styling fallback)
  const getMarkedDates = () => {
    const markings: any = {};
    markings[selectedDate] = {
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: '#FFFFFF',
    };
    return markings;
  };

  const renderDailyItem = ({ item, type }: { item: any; type: 'task' | 'pending' | 'evaluation' | 'exam' }) => {
    const isTask = type === 'task';
    const isPending = type === 'pending';
    const isEval = type === 'evaluation';
    const isExam = type === 'exam';

    let tagColor = colors.primary;
    let tagText = 'Tarea 📝';
    
    if (isPending) {
      tagColor = colors.secondary;
      tagText = 'Pendiente Rápido ⚡';
    } else if (isEval) {
      tagColor = colors.success;
      tagText = 'Evaluación 🌟';
    } else if (isExam) {
      tagColor = colors.warning;
      tagText = 'Examen 🎓';
    }

    return (
      <View style={[styles.itemCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        {isTask ? (
          <TouchableOpacity
            style={styles.checkboxWrapper}
            onPress={() => toggleTaskCompletion(item as Task)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: colors.primary,
                  backgroundColor: item.completed ? colors.primary : 'transparent',
                },
              ]}
            >
              {item.completed && (
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#FFF" />
                </Svg>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.pendingDot, { backgroundColor: tagColor }]} />
        )}

        <View style={styles.itemTextContainer}>
          <Text
            style={[
              styles.itemDesc,
              {
                color: isTask && item.completed ? colors.textSecondary : colors.text,
                textDecorationLine: isTask && item.completed ? 'line-through' : 'none',
              },
            ]}
          >
            {item.description}
          </Text>
          <Text style={[styles.itemTag, { color: tagColor }]}>
            {tagText}
          </Text>
        </View>
      </View>
    );
  };

  const combinedData = [
    ...filteredTasks.map(t => ({ ...t, _type: 'task' as const })),
    ...filteredPendings.map(p => ({ ...p, _type: 'pending' as const })),
    ...filteredEvaluations.map(e => ({ ...e, _type: 'evaluation' as const })),
    ...filteredExams.map(ex => ({ ...ex, _type: 'exam' as const })),
  ];

  const truncateText = (text: string, limit: number = 8) => {
    return text.length > limit ? text.substring(0, limit) + '..' : text;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.tabletScrollContent
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Calendar Box */}
          <View style={styles.calendarPanel}>
            <View style={[styles.calendarCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Calendar
                current={selectedDate}
                onDayPress={day => setSelectedDate(day.dateString)}
                markedDates={getMarkedDates()}
                dayComponent={({ date, state }) => {
                  if (!date) return null;
                  const dateStr = date.dateString;
                  
                  const dayTasks = allTasks.filter(t => t.due_date === dateStr);
                  const dayPendings = allPendings.filter(p => getPendingLocalDate(p.created_at) === dateStr);
                  const dayEvals = allEvaluations.filter(e => e.date === dateStr);
                  const dayExams = allExams.filter(ex => ex.date === dateStr);
                  
                  const isSelected = selectedDate === dateStr;
                  const isToday = state === 'today';
                  const isDisabled = state === 'disabled';
                  
                  // Collect item details for displaying inside cell
                  const visibleItems: any[] = [];
                  dayExams.forEach(ex => visibleItems.push({ id: ex.id, text: ex.description, color: colors.warning, type: 'exam' }));
                  dayEvals.forEach(ev => visibleItems.push({ id: ev.id, text: ev.description, color: colors.success, type: 'eval' }));
                  dayTasks.forEach(t => visibleItems.push({ id: t.id, text: t.description, color: colors.primary, type: 'task' }));
                  dayPendings.forEach(p => visibleItems.push({ id: p.id, text: p.description, color: colors.secondary, type: 'pending' }));

                  const displayItems = visibleItems.slice(0, 2); // Show at most 2 items inside cell to prevent clutter
                  const remainingCount = visibleItems.length - displayItems.length;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.dayCellContainer,
                        {
                          borderColor: isSelected ? colors.primary : (isToday ? colors.primaryLight : colors.border + '15'),
                          backgroundColor: isSelected ? colors.primaryLight + '35' : (isToday ? colors.primary + '08' : colors.backgroundCard),
                          justifyContent: isTablet ? 'flex-start' : 'center',
                          alignItems: isTablet ? 'stretch' : 'center',
                          padding: isTablet ? 3 : 2,
                        }
                      ]}
                      onPress={() => setSelectedDate(dateStr)}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          {
                            color: isDisabled ? colors.textSecondary + '44' : (isToday ? colors.primary : colors.text),
                            fontWeight: isSelected || isToday ? '800' : '600',
                            textAlign: isTablet ? 'right' : 'center',
                            marginBottom: isTablet ? 2 : 0,
                          }
                        ]}
                      >
                        {date.day}
                      </Text>
                      
                      {isTablet ? (
                        <View style={styles.dayBadgesContainer}>
                          {displayItems.map((item, idx) => (
                            <View key={item.id + idx} style={[styles.miniBadge, { backgroundColor: item.color + '15' }]}>
                              <Text numberOfLines={1} style={[styles.miniBadgeText, { color: item.color }]}>
                                {item.type === 'exam' ? '🎓 ' : item.type === 'eval' ? '🌟 ' : item.type === 'task' ? '📝 ' : '⚡ '}
                                {truncateText(item.text, 12)}
                              </Text>
                            </View>
                          ))}
                          {remainingCount > 0 && (
                            <View style={[styles.miniBadge, { backgroundColor: colors.backgroundElement }]}>
                              <Text style={[styles.miniBadgeText, { color: colors.textSecondary }]}>
                                +{remainingCount} más
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        (dayExams.length > 0 || dayEvals.length > 0 || dayTasks.length > 0 || dayPendings.length > 0) ? (
                          <View style={styles.dotsRow}>
                            {dayExams.length > 0 && <View style={[styles.dot, { backgroundColor: colors.warning }]} />}
                            {dayEvals.length > 0 && <View style={[styles.dot, { backgroundColor: colors.success }]} />}
                            {dayTasks.length > 0 && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                            {dayPendings.length > 0 && <View style={[styles.dot, { backgroundColor: colors.secondary }]} />}
                          </View>
                        ) : (
                          // Espaciador invisible para alinear el número verticalmente
                          <View style={styles.emptyDotsRow} />
                        )
                      )}
                    </TouchableOpacity>
                  );
                }}
                theme={{
                  calendarBackground: colors.backgroundCard,
                  textSectionTitleColor: colors.textSecondary,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.primary,
                  dayTextColor: colors.text,
                  textDisabledColor: colors.textSecondary + '33',
                  arrowColor: colors.primary,
                  monthTextColor: colors.text,
                  indicatorColor: colors.primary,
                  
                  // EXPANSIÓN DEL CALENDARIO EN EL HEADER
                  // @ts-ignore
                  'stylesheet.day.basic': {
                    base: {
                      width: cellWidth,
                      height: isTablet ? 90 : 44,
                      alignItems: 'stretch',
                      justifyContent: 'flex-start',
                    },
                  },
                  'stylesheet.calendar.header': {
                    week: {
                      marginTop: 10,
                      flexDirection: 'row',
                      justifyContent: 'space-around',
                    },
                  },
                }}
              />
            </View>
          </View>

          {/* Details list of selected day - ALWAYS visible */}
          <View style={styles.listPanel}>
            <View style={[styles.sectionTitleContainer, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Actividades para el {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} 🌸
              </Text>
            </View>

            {combinedData.length > 0 ? (
              <View style={styles.itemsListContainer}>
                {combinedData.map(item => (
                  <View key={item.id}>
                    {renderDailyItem({ item, type: item._type })}
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border, marginTop: 8 }]}>
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                  No hay actividades programadas para este día. ¡Disfruta tu jornada! 💕
                </Text>
              </View>
            )}
          </View>

        </ScrollView>
      )}
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
  scrollContent: {
    paddingBottom: 120,
    width: '100%',
  },
  tabletScrollContent: {
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  calendarPanel: {
    width: '100%',
    padding: 12,
    alignSelf: 'center',
  },
  listPanel: {
    width: '100%',
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  itemsListContainer: {
    width: '100%',
  },
  calendarCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    padding: 4,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 850,
  },
  sectionTitleContainer: {
    borderBottomWidth: 1.5,
    paddingVertical: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 60,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  checkboxWrapper: {
    paddingRight: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 20,
    marginLeft: 5,
  },
  itemTextContainer: {
    flex: 1,
    gap: 2,
  },
  itemDesc: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  itemTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyCardText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  dayCellContainer: {
    flex: 1,
    height: '100%',
    margin: 1.5,
    borderRadius: 8,
    borderWidth: 1.2,
    padding: 3,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  dayCellText: {
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 2,
  },
  dayBadgesContainer: {
    flex: 1,
    gap: 2,
    justifyContent: 'flex-start',
  },
  miniBadge: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    justifyContent: 'center',
  },
  miniBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    height: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyDotsRow: {
    height: 6,
    marginTop: 2,
  },
});
