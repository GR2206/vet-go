export function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function wasPrice(product: { price: number; discountPct?: number }) {
  const pct = product.discountPct ?? 0;
  if (pct <= 0 || pct >= 100) return undefined;
  return formatARS(Math.round(product.price / (1 - pct / 100)));
}

export function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function kindLabel(kind: string) {
  switch (kind) {
    case 'petshop':
      return 'Petshop';
    case 'vet':
      return 'Veterinaria';
    case 'vet24':
      return 'Guardia 24 hs';
    case 'grooming':
      return 'Peluquería';
    default:
      return kind;
  }
}

export function paymentLabel(method: string) {
  switch (method) {
    case 'mercadopago':
      return 'Mercado Pago';
    case 'transfer':
      return 'Transferencia bancaria';
    case 'wallet':
      return 'Billeteras virtuales';
    case 'cash':
      return 'Efectivo';
    case 'debit':
      return 'Débito / crédito';
    case 'card':
      return 'Tarjeta débito o crédito';
    case 'personalpay':
      return 'Personal Pay';
    case 'uala':
      return 'Ualá';
    case 'modo':
      return 'Modo';
    default:
      return method;
  }
}

export function shippingLabel(kind: string) {
  switch (kind) {
    case 'none':
      return 'Sin envío';
    case 'pickup':
      return 'Retiro en el local';
    case 'same_day':
      return 'Envío en el día';
    case 'home':
      return 'Envío a domicilio';
    case 'pickup_and_home':
      return 'Retiro y envío a domicilio';
    default:
      return kind;
  }
}
