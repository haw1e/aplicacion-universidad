import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import Svg, { Path } from 'react-native-svg';
import { useWidgetData, CalendarEvent } from '@/hooks/useWidgetData';

interface TabletCalendarWidgetProps {
  onPendingAdded?: () => void;
  onTaskToggled?: () => void;
}

export default function TabletCalendarWidget({ onPendingAdded, onTaskToggled }: TabletCalendarWidgetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    loading,
    toggleTaskCompletion,
    getEventsForDate,
  } = useWidgetData({ onPendingAdded, onTaskToggled });

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  const changeDay = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const formatNavDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
      const day = d.getDate();
      const month = d.toLocaleDateString('es-ES', { month: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
      return `${capitalizedWeekday}, ${day} ${capitalizedMonth}`;
    } catch (e) {
      return dateStr;
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

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
              Agenda de Estudios y Tareas
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
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => router.push('/quick-add-modal')}
          activeOpacity={0.8}
        >
          <Text style={[styles.quickAddBtnText, { color: '#FFF' }]}>⚡ Apunte Rápido</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ margin: 60 }} />
      ) : (
        <View style={styles.widgetBody}>
          {/* Day Navigation Bar */}
          <View style={[styles.navigationBar, { backgroundColor: colors.backgroundElement + '20', borderColor: colors.border + '50' }]}>
            <TouchableOpacity
              style={[styles.navArrowBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={() => changeDay(-1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.arrowText, { color: colors.primary }]}>◀</Text>
            </TouchableOpacity>

            <Text style={[styles.navigationDateText, { color: colors.text }]}>
              {formatNavDate(selectedDate)}
            </Text>

            <TouchableOpacity
              style={[styles.navArrowBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={() => changeDay(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.arrowText, { color: colors.primary }]}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Events List */}
          <View style={styles.listContainer}>
            <View
              style={[
                styles.listHeader,
                { borderBottomColor: colors.border + '40' },
              ]}
            >
              <Text style={[styles.listHeaderSubtitle, { color: colors.textSecondary }]}>
                Actividades programadas para este día
              </Text>
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
  widgetBody: {
    marginTop: 20,
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  navigationDateText: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  listContainer: {
    flex: 1,
  },
  listHeader: {
    borderBottomWidth: 1.5,
    paddingBottom: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '600',
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
    maxHeight: 380,
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
