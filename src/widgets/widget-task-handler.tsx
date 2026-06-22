'use no memo';
import React from 'react';
import { 
  WidgetTaskHandlerProps, 
  FlexWidget, 
  TextWidget,
  requestWidgetUpdate,
  ColorProp
} from 'react-native-android-widget';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// ----------------------------------------------------
// Supabase Client for Background Task
// ----------------------------------------------------
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

const backgroundSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key: string) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch {}
      },
      removeItem: async (key: string) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {}
      }
    },
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  }
});

// ----------------------------------------------------
// Date Calculation Helpers (Timezone Safe)
// ----------------------------------------------------
const getOffsetDate = (dateStr: string, offsetDays: number) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMondayOfCurrentWeek = () => {
  const d = new Date();
  const day = d.getDay();
  // d.getDay() returns 0 for Sunday, 1 for Monday, etc.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const getWeekDays = (weekStartStr: string, count: number = 7) => {
  const days = [];
  for (let i = 0; i < count; i++) {
    days.push(getOffsetDate(weekStartStr, i));
  }
  return days;
};

const getWeekDayLabel = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return labels[day];
};

const getDayNumber = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return String(d.getDate());
};

const getMonthYearLabel = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

const getPendingLocalDate = (createdAtStr: string) => {
  const d = new Date(createdAtStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ----------------------------------------------------
// Interfaces
// ----------------------------------------------------
interface WidgetEvent {
  id: string;
  description: string;
  date: string;
  type: 'task' | 'pending' | 'evaluation' | 'exam';
  completed?: boolean;
}

// Colors Matching App Theme
const COLORS = {
  background: '#FFF5F7',
  card: '#FFFFFF',
  text: '#2C1B20',
  textSecondary: '#8A757B',
  primary: '#FF4B87',
  secondary: '#B37FEB',
  success: '#4CAF50',
  warning: '#FFC107',
  border: '#FFD3DF',
} as const;

// ----------------------------------------------------
// Sub-Components (UI Views)
// ----------------------------------------------------

// Render a single day cell in the week strip
function DayCell({ 
  dayDate, 
  isSelected, 
  dayEvents 
}: { 
  dayDate: string; 
  isSelected: boolean; 
  dayEvents: WidgetEvent[];
}) {
  const dayLabel = getWeekDayLabel(dayDate);
  const dayNum = getDayNumber(dayDate);

  const hasTask = dayEvents.some(e => e.type === 'task');
  const hasPending = dayEvents.some(e => e.type === 'pending');
  const hasEval = dayEvents.some(e => e.type === 'evaluation');
  const hasExam = dayEvents.some(e => e.type === 'exam');

  return (
    <FlexWidget
      clickAction="SELECT_DATE"
      clickActionData={{ date: dayDate }}
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: isSelected ? COLORS.primary : COLORS.card,
        flex: 1,
        marginHorizontal: 1.5,
        height: 54,
      }}
    >
      <TextWidget
        text={dayLabel}
        style={{
          fontSize: 8,
          color: isSelected ? '#FFFFFF' : COLORS.textSecondary,
          fontWeight: 'bold',
        }}
      />
      <TextWidget
        text={dayNum}
        style={{
          fontSize: 12,
          color: isSelected ? '#FFFFFF' : COLORS.text,
          fontWeight: 'bold',
          marginTop: 2,
        }}
      />

      {/* Row of event dot indicators */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          height: 4,
          marginTop: 4,
        }}
      >
        {hasExam && (
          <FlexWidget style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: isSelected ? '#FFFFFF' : COLORS.warning, marginRight: 1 }} />
        )}
        {hasEval && (
          <FlexWidget style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: isSelected ? '#FFFFFF' : COLORS.success, marginRight: 1 }} />
        )}
        {hasTask && (
          <FlexWidget style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: isSelected ? '#FFFFFF' : COLORS.primary, marginRight: 1 }} />
        )}
        {hasPending && (
          <FlexWidget style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: isSelected ? '#FFFFFF' : COLORS.secondary }} />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

// ----------------------------------------------------
// CalendarWidgetPhone (Vertical Layout)
// ----------------------------------------------------
function CalendarWidgetPhone({ 
  events, 
  isLoggedIn, 
  isLoading,
  selectedDate,
  weekStart
}: { 
  events: WidgetEvent[]; 
  isLoggedIn: boolean; 
  isLoading: boolean;
  selectedDate: string;
  weekStart: string;
}) {
  const weekDays = getWeekDays(weekStart);
  
  // Filter events specifically for the currently selected date
  const selectedDateEvents = events.filter(e => e.date === selectedDate);
  const displayEvents = selectedDateEvents.slice(0, 3);
  const hiddenCount = selectedDateEvents.length - displayEvents.length;

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: COLORS.background,
        borderRadius: 20,
        padding: 12,
      }}
    >
      {/* Header Row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
        }}
      >
        {/* Navigation Controls */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            clickAction="PREV_WEEK"
            clickActionData={{ weekStart, offset: -7 }}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: COLORS.card,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 6,
            }}
          >
            <TextWidget text="◀" style={{ fontSize: 9, color: COLORS.primary }} />
          </FlexWidget>
          
          <TextWidget
            text={getMonthYearLabel(weekStart)}
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: COLORS.text,
            }}
          />

          <FlexWidget
            clickAction="NEXT_WEEK"
            clickActionData={{ weekStart, offset: 7 }}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: COLORS.card,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 6,
            }}
          >
            <TextWidget text="▶" style={{ fontSize: 9, color: COLORS.primary }} />
          </FlexWidget>
        </FlexWidget>

        {/* Quick Add Modal Deep Link */}
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'fastnotes://quick-add-modal' }}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: COLORS.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 13,
              color: '#FFFFFF',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Week Strip Row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 10,
        }}
      >
        {weekDays.map(dayDate => (
          <DayCell
            key={dayDate}
            dayDate={dayDate}
            isSelected={dayDate === selectedDate}
            dayEvents={events.filter(e => e.date === dayDate)}
          />
        ))}
      </FlexWidget>

      {/* Separator Line */}
      <FlexWidget
        style={{
          height: 1,
          width: 'match_parent',
          backgroundColor: COLORS.border || '#FFD3DF',
          marginBottom: 8,
        }}
      />

      {/* Body: Events list for selected date */}
      {isLoading ? (
        <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget
            text="Cargando..."
            style={{ fontSize: 11, color: COLORS.textSecondary }}
          />
        </FlexWidget>
      ) : !isLoggedIn ? (
        <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget
            text="Por favor inicia sesión 🔑"
            style={{ fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' }}
          />
        </FlexWidget>
      ) : selectedDateEvents.length === 0 ? (
        <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget
            text="¡Día despejado! 🌸"
            style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 'bold' }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          {displayEvents.map((event) => {
            let typeColor: ColorProp = COLORS.primary;
            if (event.type === 'pending') typeColor = COLORS.secondary;
            if (event.type === 'evaluation') typeColor = COLORS.success;
            if (event.type === 'exam') typeColor = COLORS.warning;

            return (
              <FlexWidget
                key={event.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  backgroundColor: COLORS.card,
                  borderRadius: 6,
                  width: 'match_parent',
                  marginBottom: 4,
                }}
              >
                <FlexWidget
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: typeColor,
                    marginRight: 6,
                  }}
                />
                <TextWidget
                  text={event.description}
                  style={{
                    fontSize: 10,
                    color: COLORS.text,
                    fontWeight: '500',
                  }}
                />
              </FlexWidget>
            );
          })}

          {hiddenCount > 0 && (
            <TextWidget
              text={`+${hiddenCount} actividades más...`}
              style={{
                fontSize: 8,
                color: COLORS.textSecondary,
                fontStyle: 'italic',
                textAlign: 'right',
              }}
            />
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

// ----------------------------------------------------
// CalendarWidgetTablet (Wider Side-by-Side Layout)
// ----------------------------------------------------
function CalendarWidgetTablet({ 
  events, 
  isLoggedIn, 
  isLoading,
  selectedDate,
  weekStart
}: { 
  events: WidgetEvent[]; 
  isLoggedIn: boolean; 
  isLoading: boolean;
  selectedDate: string;
  weekStart: string;
}) {
  const weekDays = getWeekDays(weekStart, 14);
  const selectedDateEvents = events.filter(e => e.date === selectedDate);
  const displayEvents = selectedDateEvents.slice(0, 5);
  const hiddenCount = selectedDateEvents.length - displayEvents.length;

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: COLORS.background,
        borderRadius: 22,
        padding: 16,
      }}
    >
      {/* Header Row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 12,
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text="FastNotes Agenda 🖥️"
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: COLORS.primary,
            }}
          />
        </FlexWidget>

        {/* Quick Add Button */}
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'fastnotes://quick-add-modal' }}
          style={{
            flexDirection: 'row',
            height: 26,
            paddingHorizontal: 10,
            borderRadius: 13,
            backgroundColor: COLORS.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="+ Nuevo Pendiente"
            style={{
              fontSize: 10,
              color: '#FFFFFF',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Body: Columns Side-by-Side */}
      <FlexWidget style={{ flexDirection: 'row', flex: 1 }}>
        
        {/* Left Column: Calendar & Week Slider */}
        <FlexWidget style={{ flexDirection: 'column', flex: 1.8, marginRight: 14 }}>
          
          {/* Week Selector Bar */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'match_parent',
              marginBottom: 8,
              backgroundColor: COLORS.card,
              borderRadius: 8,
              padding: 6,
            }}
          >
            <FlexWidget
              clickAction="PREV_WEEK"
              clickActionData={{ weekStart, offset: -14 }}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: COLORS.background,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TextWidget text="◀" style={{ fontSize: 9, color: COLORS.primary }} />
            </FlexWidget>
            
            <TextWidget
              text={getMonthYearLabel(weekStart)}
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: COLORS.text,
              }}
            />

            <FlexWidget
              clickAction="NEXT_WEEK"
              clickActionData={{ weekStart, offset: 14 }}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: COLORS.background,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TextWidget text="▶" style={{ fontSize: 9, color: COLORS.primary }} />
            </FlexWidget>
          </FlexWidget>

          {/* Semana 1 (Días 1 a 7) */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: 'match_parent',
              marginBottom: 8,
            }}
          >
            {weekDays.slice(0, 7).map(dayDate => (
              <DayCell
                key={dayDate}
                dayDate={dayDate}
                isSelected={dayDate === selectedDate}
                dayEvents={events.filter(e => e.date === dayDate)}
              />
            ))}
          </FlexWidget>

          {/* Semana 2 (Días 8 a 14) */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: 'match_parent',
            }}
          >
            {weekDays.slice(7, 14).map(dayDate => (
              <DayCell
                key={dayDate}
                dayDate={dayDate}
                isSelected={dayDate === selectedDate}
                dayEvents={events.filter(e => e.date === dayDate)}
              />
            ))}
          </FlexWidget>
        </FlexWidget>

        {/* Vertical Divider */}
        <FlexWidget
          style={{
            width: 1,
            height: 'match_parent',
            backgroundColor: COLORS.border || '#FFD3DF',
          }}
        />

        {/* Right Column: Events List */}
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <TextWidget
            text={`Agenda del ${getDayNumber(selectedDate)} de ${getMonthYearLabel(selectedDate).split(' ')[0]}:`}
            style={{
              fontSize: 11,
              fontWeight: 'bold',
              color: COLORS.text,
              marginBottom: 6,
            }}
          />

          {isLoading ? (
            <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <TextWidget text="Cargando..." style={{ fontSize: 11, color: COLORS.textSecondary }} />
            </FlexWidget>
          ) : !isLoggedIn ? (
            <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <TextWidget text="Por favor inicia sesión 🔑" style={{ fontSize: 11, color: COLORS.textSecondary }} />
            </FlexWidget>
          ) : selectedDateEvents.length === 0 ? (
            <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <TextWidget text="¡Nada programado! 🎉" style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 'bold' }} />
            </FlexWidget>
          ) : (
            <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
              {displayEvents.map((event) => {
                let typeColor: ColorProp = COLORS.primary;
                let typeText = 'Tarea';
                if (event.type === 'pending') { typeColor = COLORS.secondary; typeText = 'Pendiente'; }
                if (event.type === 'evaluation') { typeColor = COLORS.success; typeText = 'Eval'; }
                if (event.type === 'exam') { typeColor = COLORS.warning; typeText = 'Examen'; }

                return (
                  <FlexWidget
                    key={event.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 6,
                      backgroundColor: COLORS.card,
                      borderRadius: 8,
                      marginBottom: 5,
                    }}
                  >
                    <FlexWidget
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: typeColor,
                        marginRight: 6,
                      }}
                    />
                    <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
                      <TextWidget
                        text={event.description}
                        style={{ fontSize: 10, color: COLORS.text, fontWeight: 'bold' }}
                      />
                      <TextWidget
                        text={typeText}
                        style={{ fontSize: 7, color: typeColor, fontWeight: 'bold' }}
                      />
                    </FlexWidget>
                  </FlexWidget>
                );
              })}

              {hiddenCount > 0 && (
                <TextWidget
                  text={`Y +${hiddenCount} actividades más...`}
                  style={{
                    fontSize: 8,
                    color: COLORS.textSecondary,
                    fontStyle: 'italic',
                    textAlign: 'right',
                  }}
                />
              )}
            </FlexWidget>
          )}
        </FlexWidget>

      </FlexWidget>
    </FlexWidget>
  );
}

// ----------------------------------------------------
// Main Task Handler
// ----------------------------------------------------
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo } = props;
  const isTabletWidget = widgetInfo.widgetName === 'CalendarWidgetTablet';

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Recover/Initialize State from SecureStore
  let selectedDate: string = (await SecureStore.getItemAsync('widget_selected_date')) || todayStr;
  let weekStart: string = (await SecureStore.getItemAsync('widget_week_start')) || getMondayOfCurrentWeek();

  // Ensure they are stored
  await SecureStore.setItemAsync('widget_selected_date', selectedDate);
  await SecureStore.setItemAsync('widget_week_start', weekStart);

  // 2. Handle Custom Click Actions
  if (widgetAction === 'WIDGET_CLICK') {
    const action = props.clickAction;
    const actionData: any = props.clickActionData;

    if (action === 'SELECT_DATE' && actionData?.date) {
      selectedDate = actionData.date;
      await SecureStore.setItemAsync('widget_selected_date', selectedDate);
    } else if (action === 'PREV_WEEK' && actionData?.weekStart) {
      const offset = typeof actionData.offset === 'number' ? actionData.offset : -7;
      weekStart = getOffsetDate(actionData.weekStart, offset);
      selectedDate = weekStart; // Set selected date to the new week's Monday
      await SecureStore.setItemAsync('widget_week_start', weekStart);
      await SecureStore.setItemAsync('widget_selected_date', selectedDate);
    } else if (action === 'NEXT_WEEK' && actionData?.weekStart) {
      const offset = typeof actionData.offset === 'number' ? actionData.offset : 7;
      weekStart = getOffsetDate(actionData.weekStart, offset);
      selectedDate = weekStart; // Set selected date to the new week's Monday
      await SecureStore.setItemAsync('widget_week_start', weekStart);
      await SecureStore.setItemAsync('widget_selected_date', selectedDate);
    }
  }

  // 3. Immediately render Loading State to prevent blank screen timing issues on Android
  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE') {
    if (isTabletWidget) {
      props.renderWidget(
        <CalendarWidgetTablet 
          events={[]} 
          isLoggedIn={false} 
          isLoading={true} 
          selectedDate={selectedDate} 
          weekStart={weekStart} 
        />
      );
    } else {
      props.renderWidget(
        <CalendarWidgetPhone 
          events={[]} 
          isLoggedIn={false} 
          isLoading={true} 
          selectedDate={selectedDate} 
          weekStart={weekStart} 
        />
      );
    }
  }

  // 4. Fetch the week's events asynchronously
  let isLoggedIn = false;
  let events: WidgetEvent[] = [];

  try {
    const { data: { session } } = await backgroundSupabase.auth.getSession();
    if (session?.user) {
      isLoggedIn = true;
      const user = session.user;
      
      const firstDay = weekStart;
      const lastDay = getOffsetDate(weekStart, 13);

      // Fetch tasks, evaluations, and exams in range
      const [tasksRes, pendingsRes, evalsRes, examsRes] = await Promise.all([
        backgroundSupabase.from('tasks').select('id, description, due_date, completed').eq('user_id', user.id).gte('due_date', firstDay).lte('due_date', lastDay),
        backgroundSupabase.from('pendings').select('id, description, created_at').eq('user_id', user.id),
        backgroundSupabase.from('evaluations').select('id, description, evaluation_date, date').eq('user_id', user.id),
        backgroundSupabase.from('exams').select('id, description, exam_date, date').eq('user_id', user.id),
      ]);

      // Map Tasks
      if (tasksRes.data) {
        tasksRes.data.forEach((t: any) => {
          events.push({
            id: t.id,
            description: t.description,
            date: t.due_date,
            type: 'task',
            completed: t.completed,
          });
        });
      }

      // Map Quick Pendings (Created on each day of the week)
      if (pendingsRes.data) {
        pendingsRes.data.forEach((p: any) => {
          const pDate = getPendingLocalDate(p.created_at);
          if (pDate >= firstDay && pDate <= lastDay) {
            events.push({
              id: p.id,
              description: p.description,
              date: pDate,
              type: 'pending',
            });
          }
        });
      }

      // Map Evaluations (Checking due_date / date fields)
      if (evalsRes.data) {
        evalsRes.data.forEach((e: any) => {
          const eDate = e.evaluation_date || e.date;
          if (eDate >= firstDay && eDate <= lastDay) {
            events.push({
              id: e.id,
              description: e.description,
              date: eDate,
              type: 'evaluation',
            });
          }
        });
      }

      // Map Exams
      if (examsRes.data) {
        examsRes.data.forEach((ex: any) => {
          const exDate = ex.exam_date || ex.date;
          if (exDate >= firstDay && exDate <= lastDay) {
            events.push({
              id: ex.id,
              description: ex.description,
              date: exDate,
              type: 'exam',
            });
          }
        });
      }
    }
  } catch (error) {
    console.error('Error fetching data for widget background task:', error);
  }

  // 5. Final render with populated data
  if (isTabletWidget) {
    props.renderWidget(
      <CalendarWidgetTablet 
        events={events} 
        isLoggedIn={isLoggedIn} 
        isLoading={false} 
        selectedDate={selectedDate} 
        weekStart={weekStart} 
      />
    );
  } else {
    props.renderWidget(
      <CalendarWidgetPhone 
        events={events} 
        isLoggedIn={isLoggedIn} 
        isLoading={false} 
        selectedDate={selectedDate} 
        weekStart={weekStart} 
      />
    );
  }
}

// ----------------------------------------------------
// App Helper to Request Immediate Updates for All Widgets
// ----------------------------------------------------
export async function requestAllWidgetsUpdate() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    let selectedDate: string = (await SecureStore.getItemAsync('widget_selected_date')) || todayStr;
    let weekStart: string = (await SecureStore.getItemAsync('widget_week_start')) || getMondayOfCurrentWeek();

    let isLoggedIn = false;
    let events: WidgetEvent[] = [];

    try {
      const { data: { session } } = await backgroundSupabase.auth.getSession();
      if (session?.user) {
        isLoggedIn = true;
        const user = session.user;
        const firstDay = weekStart;
        const lastDay = getOffsetDate(weekStart, 13);

        const [tasksRes, pendingsRes, evalsRes, examsRes] = await Promise.all([
          backgroundSupabase.from('tasks').select('id, description, due_date, completed').eq('user_id', user.id).gte('due_date', firstDay).lte('due_date', lastDay),
          backgroundSupabase.from('pendings').select('id, description, created_at').eq('user_id', user.id),
          backgroundSupabase.from('evaluations').select('id, description, evaluation_date, date').eq('user_id', user.id),
          backgroundSupabase.from('exams').select('id, description, exam_date, date').eq('user_id', user.id),
        ]);

        if (tasksRes.data) {
          tasksRes.data.forEach((t: any) => {
            events.push({ id: t.id, description: t.description, date: t.due_date, type: 'task', completed: t.completed });
          });
        }
        if (pendingsRes.data) {
          pendingsRes.data.forEach((p: any) => {
            const pDate = getPendingLocalDate(p.created_at);
            if (pDate >= firstDay && pDate <= lastDay) {
              events.push({ id: p.id, description: p.description, date: pDate, type: 'pending' });
            }
          });
        }
        if (evalsRes.data) {
          evalsRes.data.forEach((ev: any) => {
            const evDate = ev.evaluation_date || ev.date;
            if (evDate >= firstDay && evDate <= lastDay) {
              events.push({ id: ev.id, description: ev.description, date: evDate, type: 'evaluation' });
            }
          });
        }
        if (examsRes.data) {
          examsRes.data.forEach((ex: any) => {
            const exDate = ex.exam_date || ex.date;
            if (exDate >= firstDay && exDate <= lastDay) {
              events.push({ id: ex.id, description: ex.description, date: exDate, type: 'exam' });
            }
          });
        }
      }
    } catch (err) {
      console.log('Error fetching in requestAllWidgetsUpdate:', err);
    }

    await requestWidgetUpdate({
      widgetName: 'CalendarWidgetPhone',
      renderWidget: () => (
        <CalendarWidgetPhone
          events={events}
          isLoggedIn={isLoggedIn}
          isLoading={false}
          selectedDate={selectedDate}
          weekStart={weekStart}
        />
      ),
    });

    await requestWidgetUpdate({
      widgetName: 'CalendarWidgetTablet',
      renderWidget: () => (
        <CalendarWidgetTablet
          events={events}
          isLoggedIn={isLoggedIn}
          isLoading={false}
          selectedDate={selectedDate}
          weekStart={weekStart}
        />
      ),
    });
  } catch (e) {
    console.log('Error in requestAllWidgetsUpdate:', e);
  }
}
