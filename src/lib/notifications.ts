import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }

  // Create default notification channel on Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4B87',
    });
  }

  return true;
}

export async function cancelItemNotifications(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`${id}-7d`);
    await Notifications.cancelScheduledNotificationAsync(`${id}-1d`);
  } catch (error) {
    console.log('Error cancelling notifications:', error);
  }
}

export async function scheduleItemNotifications(
  id: string,
  title: string,
  dateStr: string,
  type: 'Evaluación' | 'Examen'
) {
  // Clean up any existing notifications for this item
  await cancelItemNotifications(id);

  // Request permissions
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const itemDate = new Date(dateStr + 'T09:00:00');
  const now = new Date();

  // Schedule notification: 7 days before at 9:00 AM
  const trigger7d = new Date(itemDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (trigger7d > now) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${id}-7d`,
        content: {
          title: `¡Falta poco! 📅`,
          body: `Quedan 7 días para tu ${type.toLowerCase()}: "${title}".`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger7d,
          channelId: 'default',
        },
      });
    } catch (e) {
      console.log('Error scheduling 7d notification:', e);
    }
  }

  // Schedule notification: 1 day before (tomorrow) at 9:00 AM
  const trigger1d = new Date(itemDate.getTime() - 1 * 24 * 60 * 60 * 1000);
  if (trigger1d > now) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${id}-1d`,
        content: {
          title: `¡Mañana es el día! 🚨`,
          body: `Mañana es tu ${type.toLowerCase()}: "${title}". ¡Mucha suerte! 🍀`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger1d,
          channelId: 'default',
        },
      });
    } catch (e) {
      console.log('Error scheduling 1d notification:', e);
    }
  }
}
