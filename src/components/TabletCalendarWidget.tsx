import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Calendar } from 'react-native-calendars';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useWidgetData, CalendarEvent } from '@/hooks/useWidgetData';

interface TabletCalendarWidgetProps {
  onPendingAdded?: () => void;
  onTaskToggled?: () => void;
}

export default function TabletCalendarWidget({ onPendingAdded, onTaskToggled }: TabletCalendarWidgetProps) {
  const { colors } = useTheme();
  const {
    loading,
    savingPending,
    saveQuickPending,
    toggleTaskCompletion,
    getEventsForDate,
    getPendingLocalDate,
    tasks,
    pendings,
    evaluations,
    exams,
  } = useWidgetData({ onPendingAdded, onTaskToggled });

  // State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [pendingText, setPendingText] = useState('');

  // Reanimated values for inline quick add
  const quickAddProgress = useSharedValue(0);

  useEffect(() => {
    quickAddProgress.value = withSpring(showQuickAdd ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [showQuickAdd, quickAddProgress]);

  const quickAddAnimStyle = useAnimatedStyle(() => {
    const height = interpolate(quickAddProgress.value, [0, 1], [0, 80]);
    const opacity = interpolate(quickAddProgress.value, [0, 0.5, 1], [0, 0, 1]);
    const marginTop = interpolate(quickAddProgress.value, [0, 1], [0, 12]);
    return {
      height,
      opacity,
      marginTop,
      overflow: 'hidden',
    };
  });

  const handleAddPending = async () => {
    if (!pendingText.trim()) return;
    const success = await saveQuickPending(pendingText);
    if (success) {
      setPendingText('');
      setShowQuickAdd(false);
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const getMarkedDates = () => {
    const marked: any = {};
    marked[selectedDate] = {
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: '#FFFFFF',
    };
    return marked;
  };

  const renderEventItem = ({ item }: { item: CalendarEvent }) => {
    const isTask = item.type === 'task';
    let typeLabel = 'Tarea 📝';
    let typeColor = colors.primary;

    if (item.type === 'pending') {
      typeLabel = 'Pendiente ⚡';
      typeColor = colors.secondary;
    } else if (item.type === 'evaluation') {
      typeLabel = 'Evaluación 🌟';
      typeColor = colors.success;
    } else if (item.type === 'exam') {
      typeLabel = 'Examen 🎓';
      typeColor = colors.warning;
    }

    return (
      <View
        style={[
          styles.itemRow,
          {
            backgroundColor: colors.backgroundElement + '30',
            borderColor: colors.border + '40',
          },
        ]}
      >
        {isTask ? (
          <TouchableOpacity
            style={styles.checkboxTouch}
            onPress={() => toggleTaskCompletion(item.id, !!item.completed)}
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
          <View style={[styles.dotIndicator, { backgroundColor: typeColor }]} />
        )}

        <View style={styles.itemMeta}>
          <Text
            style={[
              styles.itemDescText,
              {
                color: isTask && item.completed ? colors.textSecondary : colors.text,
                textDecorationLine: isTask && item.completed ? 'line-through' : 'none',
              },
            ]}
          >
            {item.description}
          </Text>
          <Text style={[styles.itemTypeTag, { color: typeColor }]}>
            {typeLabel}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.widgetCard,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Widget Header */}
      <View style={styles.widgetHeader}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.widgetIconBg, { backgroundColor: colors.secondary + '15' }]}>
            <Text style={{ fontSize: 20 }}>🖥️</Text>
          </View>
          <View>
            <Text style={[styles.widgetTitle, { color: colors.text }]}>
              Agenda de Estudios y Calendario
            </Text>
            <Text style={[styles.widgetSubtitle, { color: colors.textSecondary }]}>
              Vista Ampliada para Tablets
            </Text>
          </View>
        </View>

        {/* Quick Add Button */}
        <TouchableOpacity
          style={[
            styles.quickAddBtn,
            {
              backgroundColor: showQuickAdd ? colors.backgroundElement : colors.primary,
            },
          ]}
          onPress={() => setShowQuickAdd(!showQuickAdd)}
          activeOpacity={0.8}
        >
          {showQuickAdd ? (
            <Text style={[styles.quickAddBtnText, { color: colors.primary }]}>Cerrar</Text>
          ) : (
            <Text style={[styles.quickAddBtnText, { color: '#FFF' }]}>⚡ Pendiente Rápido</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Inline Quick Add Input Box */}
      <Animated.View style={quickAddAnimStyle}>
        <View
          style={[
            styles.quickInputWrapper,
            {
              backgroundColor: colors.backgroundElement + '30',
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            style={[styles.quickInput, { color: colors.text }]}
            placeholder="Escribe un pendiente que quieras recordar y presiona enter..."
            placeholderTextColor={colors.textSecondary + '80'}
            value={pendingText}
            onChangeText={setPendingText}
            onSubmitEditing={handleAddPending}
          />
          <TouchableOpacity
            style={[
              styles.quickSaveBtn,
              {
                backgroundColor: colors.primary,
                opacity: pendingText.trim() ? 1 : 0.6,
              },
            ]}
            onPress={handleAddPending}
            disabled={savingPending || !pendingText.trim()}
          >
            {savingPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ margin: 60 }} />
      ) : (
        <View style={styles.widgetBody}>
          {/* Side-by-side Columns */}
          <View style={styles.columnsContainer}>
            {/* Left Column: Calendar */}
            <View style={styles.leftColumn}>
              <Calendar
                current={selectedDate}
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markedDates={getMarkedDates()}
                dayComponent={({ date, state }) => {
                  if (!date) return null;
                  const dStr = date.dateString;

                  const dayTasks = tasks.filter((t) => t.due_date === dStr);
                  const dayPendings = pendings.filter(
                    (p) => getPendingLocalDate(p.created_at) === dStr
                  );
                  const dayEvals = evaluations.filter((e) => e.date === dStr);
                  const dayExams = exams.filter((ex) => ex.date === dStr);

                  const isSelected = selectedDate === dStr;
                  const isToday = state === 'today';
                  const isDisabled = state === 'disabled';

                  const hasTask = dayTasks.length > 0;
                  const hasPending = dayPendings.length > 0;
                  const hasEval = dayEvals.length > 0;
                  const hasExam = dayExams.length > 0;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.compactDay,
                        {
                          borderColor: isSelected
                            ? colors.primary
                            : isToday
                            ? colors.primaryLight
                            : 'transparent',
                          backgroundColor: isSelected
                            ? colors.primary + '18'
                            : isToday
                            ? colors.primary + '05'
                            : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedDate(dStr)}
                    >
                      <Text
                        style={[
                          styles.compactDayText,
                          {
                            color: isDisabled
                              ? colors.textSecondary + '40'
                              : isToday
                              ? colors.primary
                              : colors.text,
                            fontWeight: isSelected || isToday ? '700' : '500',
                          },
                        ]}
                      >
                        {date.day}
                      </Text>

                      {/* Dots Row */}
                      <View style={styles.dotsRow}>
                        {hasExam && (
                          <View style={[styles.miniDot, { backgroundColor: colors.warning }]} />
                        )}
                        {hasEval && (
                          <View style={[styles.miniDot, { backgroundColor: colors.success }]} />
                        )}
                        {hasTask && (
                          <View style={[styles.miniDot, { backgroundColor: colors.primary }]} />
                        )}
                        {hasPending && (
                          <View style={[styles.miniDot, { backgroundColor: colors.secondary }]} />
                        )}
                      </View>
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
                  textDisabledColor: colors.textSecondary + '20',
                  arrowColor: colors.primary,
                  monthTextColor: colors.text,
                  indicatorColor: colors.primary,
                  // @ts-ignore
                  'stylesheet.calendar.header': {
                    header: {
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      marginTop: 0,
                    },
                    week: {
                      marginTop: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-around',
                      borderBottomWidth: 1.5,
                      borderBottomColor: colors.border + '30',
                      paddingBottom: 6,
                    },
                  },
                  'stylesheet.day.basic': {
                    base: {
                      width: 48,
                      height: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  },
                }}
              />
            </View>

            {/* Divider */}
            <View style={[styles.columnDivider, { backgroundColor: colors.border + '50' }]} />

            {/* Right Column: Events */}
            <View style={styles.rightColumn}>
              <View
                style={[
                  styles.listHeader,
                  { borderBottomColor: colors.border + '40' },
                ]}
              >
                <View>
                  <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
                    Agenda para el:{' '}
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Text>
                  <Text style={[styles.listHeaderSubtitle, { color: colors.textSecondary }]}>
                    Detalles de actividades programadas
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {selectedDateEvents.length}{' '}
                    {selectedDateEvents.length === 1 ? 'evento' : 'eventos'}
                  </Text>
                </View>
              </View>

              {selectedDateEvents.length > 0 ? (
                <FlatList
                  data={selectedDateEvents}
                  keyExtractor={(item) => item.id}
                  renderItem={renderEventItem}
                  contentContainerStyle={styles.listContent}
                  style={styles.eventsScrollList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>🌸</Text>
                  <Text style={[styles.emptyText, { color: colors.text }]}>
                    No hay actividades programadas
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    ¡Disfruta de un día libre de entregas y evaluaciones!
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  widgetCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.02)',
    paddingBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  widgetIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  widgetSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quickAddBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  quickInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  quickSaveBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  widgetBody: {
    marginTop: 20,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 24,
    minHeight: 380,
  },
  leftColumn: {
    flex: 1.1,
    justifyContent: 'center',
  },
  columnDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 10,
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 8,
  },
  compactDay: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    gap: 4,
  },
  compactDayText: {
    fontSize: 14,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    height: 5,
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  listHeader: {
    borderBottomWidth: 1.5,
    paddingBottom: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  listHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventsScrollList: {
    maxHeight: 320,
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  checkboxTouch: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 18,
    marginLeft: 6,
  },
  itemMeta: {
    flex: 1,
    gap: 3,
  },
  itemDescText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  itemTypeTag: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
