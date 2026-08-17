import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export async function openNativeMaps(opts: {
  latitude: number;
  longitude: number;
  label: string;
  mode?: 'place' | 'walk';
}) {
  const { latitude, longitude, label, mode = 'place' } = opts;
  const q = encodeURIComponent(`${label}, Rosario`);
  const dest = `${latitude},${longitude}`;

  const apple =
    mode === 'walk'
      ? `http://maps.apple.com/?daddr=${dest}&q=${q}&dirflg=w`
      : `http://maps.apple.com/?ll=${dest}&q=${q}&z=17`;

  const googleWeb =
    mode === 'walk'
      ? `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;

  const googleApp =
    mode === 'walk'
      ? `comgooglemaps://?daddr=${dest}&directionsmode=walking&q=${q}`
      : `comgooglemaps://?q=${dest}&center=${dest}`;

  if (Platform.OS === 'ios') {
    try {
      await Linking.openURL(apple);
      return;
    } catch {
      await Linking.openURL(googleWeb);
      return;
    }
  }

  try {
    const canApp = await Linking.canOpenURL(googleApp);
    if (canApp) {
      await Linking.openURL(googleApp);
      return;
    }
  } catch {
    /* usa el enlace https */
  }

  try {
    await Linking.openURL(googleWeb);
  } catch {
    await Linking.openURL(`geo:${dest}?q=${dest}(${q})`);
  }
}
