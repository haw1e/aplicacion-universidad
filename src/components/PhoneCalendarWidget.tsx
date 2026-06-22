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

interface PhoneCalendarWidgetProps {
  onPendingAdded?: () => void;
  onTaskToggled?: () => void;
}

export default function PhoneCalendarWidget({ onPendingAdded, onTaskToggled }: PhoneCalendarWidgetProps) {
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
            backgroundColor: colors.backgroundElement + '40',
            borderColor: colors.border + '50',
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
                <Svg width={12} height={12} viewBox="0 0 24 24">
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
            numberOfLines={2}
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
          <View style={[styles.widgetIconBg, { backgroundColor: colors.primary + '15' }]}>
            <Text style={{ fontSize: 16 }}>📅</Text>
          </View>
          <View>
            <Text style={[styles.widgetTitle, { color: colors.text }]}>Mi Agenda</Text>
            <Text style={[styles.widgetSubtitle, { color: colors.textSecondary }]}>Teléfono</Text>
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
            <Text style={[styles.quickAddBtnText, { color: '#FFF' }]}>⚡ Pendiente</Text>
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
            placeholder="Añadir pendiente rápido..."
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
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#FFF" />
              </Svg>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
      ) : (
        <View style={styles.widgetBody}>
          {/* Calendar Grid Container */}
          <View style={styles.calendarContainer}>
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
                // Make calendar header and spacing super compact
                // @ts-ignore
                'stylesheet.calendar.header': {
                  header: {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 8,
                    marginTop: 0,
                  },
                  week: {
                    marginTop: 4,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border + '30',
                    paddingBottom: 4,
                  },
                },
                'stylesheet.day.basic': {
                  base: {
                    width: 38,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                },
              }}
            />
          </View>

          {/* Activities List for Selected Day */}
          <View style={styles.listContainer}>
            <View
              style={[
                styles.listHeader,
                { borderBottomColor: colors.border + '30' },
              ]}
            >
              <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
              <Text style={[styles.listHeaderCount, { color: colors.textSecondary }]}>
                {selectedDateEvents.length}{' '}
                {selectedDateEvents.length === 1 ? 'actividad' : 'actividades'}
              </Text>
            </View>

            {selectedDateEvents.length > 0 ? (
              <FlatList
                data={selectedDateEvents}
                keyExtractor={(item) => item.id}
                renderItem={renderEventItem}
                scrollEnabled={false} // since it's embedded in widget
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Día despejado. ¡Buen trabajo! 🌸
                </Text>
              </View>
            )}
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    width: '100%',
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  widgetIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  widgetSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickAddBtn: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  quickInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    padding: 0,
  },
  quickSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetBody: {
    marginTop: 12,
    gap: 16,
  },
  calendarContainer: {
    width: '100%',
  },
  compactDay: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    gap: 2,
  },
  compactDayText: {
    fontSize: 12,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    height: 4,
  },
  miniDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  listContainer: {
    width: '100%',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginBottom: 10,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  listHeaderCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  listContent: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkboxTouch: {
    marginRight: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 15,
    marginLeft: 5,
  },
  itemMeta: {
    flex: 1,
    gap: 1,
  },
  itemDescText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },
  itemTypeTag: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
