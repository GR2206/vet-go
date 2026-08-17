import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

type Target = {
  schemes: string[];
  store: string;
  web: string;
};

const TARGETS: Record<'mercadopago' | 'personalpay' | 'uala' | 'modo', Target> = {
  mercadopago: {
    schemes:
      Platform.OS === 'android'
        ? [
            'mercadopago://home',
            'mercadopago://',
            'intent://home#Intent;scheme=mercadopago;package=com.mercadopago.wallet;end',
          ]
        : ['mercadopago://home', 'mercadopago://'],
    store:
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/ar/app/mercado-pago/id925878808'
        : 'market://details?id=com.mercadopago.wallet',
    web: 'https://www.mercadopago.com.ar',
  },
  personalpay: {
    schemes: ['personalpay://', 'mipersonalpay://'],
    store:
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/ar/app/personal-pay/id1581166069'
        : 'market://details?id=com.personal.personalpay',
    web: 'https://www.personalpay.com.ar',
  },
  uala: {
    schemes: ['uala://', 'ar.com.uala://'],
    store:
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/ar/app/ual%C3%A1/id1224365420'
        : 'market://details?id=ar.com.uala',
    web: 'https://www.uala.com.ar',
  },
  modo: {
    schemes: ['modo://', 'bna.modo://'],
    store:
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/ar/app/modo/id1533804286'
        : 'market://details?id=com.modo.modoapp',
    web: 'https://www.modo.com.ar',
  },
};

async function tryOpen(url: string) {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function openWalletApp(id: keyof typeof TARGETS) {
  const target = TARGETS[id];
  for (const url of target.schemes) {
    if (await tryOpen(url)) return;
  }
  if (await tryOpen(target.store)) return;
  await tryOpen(target.web);
}

export async function openMercadoPago() {
  const endpoint = process.env.EXPO_PUBLIC_MP_CHECKOUT_URL;
  if (endpoint) {
    if (await tryOpen(endpoint)) return;
  }
  await openWalletApp('mercadopago');
}
