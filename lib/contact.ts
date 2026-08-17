import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import { CONTACT_EMAIL } from './contact-info';

export { CONTACT_EMAIL, CONTACT_WHATSAPP } from './contact-info';

export async function openContactEmail() {
  const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Consulta PETS&GO')}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Contacto', CONTACT_EMAIL);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Contacto', CONTACT_EMAIL);
  }
}
