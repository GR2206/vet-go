import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function notificationsAllowed() {
  return Platform.OS !== 'web' && !expoGo;
}

export async function initNotifications() {
  if (!notificationsAllowed()) return false;
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Pedidos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const next = await Notifications.requestPermissionsAsync();
    return next.status === 'granted';
  } catch {
    return false;
  }
}

export async function notifyOrderConfirmed(shopName: string, orderId: string) {
  if (!notificationsAllowed()) return;
  try {
    const Notifications = await import('expo-notifications');
    await initNotifications();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pedido confirmado',
        body: `${shopName} confirmó tu compra. Lo recibirás a la brevedad.`,
        data: { orderId, type: 'order_confirmed' },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'orders' } : {}),
      },
      trigger: null,
    });
  } catch {
    /* sin notificaciones en Expo Go */
  }
}
