import * as WebBrowser from 'expo-web-browser';

import { PLATFORM_FEE_RATE } from '@/lib/payout';

WebBrowser.maybeCompleteAuthSession();

/**
 * Mercado Pago Checkout Pro (marketplace).
 * El ACCESS_TOKEN va en un backend, nunca en la app.
 * Preferencia: application_fee / marketplace_fee = 12% del total.
 */
export function mercadoPagoPreferenceDraft(input: {
  title: string;
  amount: number;
  shopId: string;
  orderId: string;
}) {
  const fee = Math.round(input.amount * PLATFORM_FEE_RATE);
  return {
    items: [
      {
        title: input.title,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: input.amount,
      },
    ],
    marketplace_fee: fee,
    external_reference: input.orderId,
    metadata: { shopId: input.shopId, platform: 'vetgo' },
    back_urls: {
      success: 'vetgo://pay/success',
      pending: 'vetgo://pay/pending',
      failure: 'vetgo://pay/failure',
    },
    auto_return: 'approved',
  };
}

export async function payWithMercadoPago(input: {
  title: string;
  amount: number;
  shopId: string;
  orderId: string;
}): Promise<'paid' | 'cancel'> {
  const endpoint = process.env.EXPO_PUBLIC_MP_CHECKOUT_URL;
  if (endpoint) {
    const url = `${endpoint}?orderId=${encodeURIComponent(input.orderId)}&amount=${input.amount}&shopId=${encodeURIComponent(input.shopId)}`;
    const result = await WebBrowser.openAuthSessionAsync(url, 'vetgo://pay/success');
    return result.type === 'success' ? 'paid' : 'cancel';
  }
  await new Promise((r) => setTimeout(r, 900));
  return 'paid';
}

export { mercadoPagoPreferenceDraft as preferenceDraft };
