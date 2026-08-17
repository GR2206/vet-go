import type { CheckoutMethod } from '@/data/types';

export type { CheckoutMethod };

export const CHECKOUT_METHODS: {
  id: CheckoutMethod;
  label: string;
  icon: 'credit-card' | 'university' | 'mobile' | 'google-wallet' | 'qrcode' | 'dollar';
}[] = [
  { id: 'mercadopago', label: 'Mercado Pago', icon: 'dollar' },
  { id: 'card', label: 'Tarjeta débito o crédito', icon: 'credit-card' },
  { id: 'transfer', label: 'Transferencia', icon: 'university' },
  { id: 'personalpay', label: 'Personal Pay', icon: 'mobile' },
  { id: 'uala', label: 'Ualá', icon: 'google-wallet' },
  { id: 'modo', label: 'Modo', icon: 'qrcode' },
];

export const PLATFORM_TRANSFER = {
  alias: 'vetgo.pagos',
  holder: 'GR Producciones',
};

export function checkoutMethodLabel(method: CheckoutMethod | string) {
  return CHECKOUT_METHODS.find((m) => m.id === method)?.label ?? method;
}
