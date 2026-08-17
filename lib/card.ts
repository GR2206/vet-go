export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'unknown';
export type PayKind = 'credit' | 'debit';

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function detectCardBrand(number: string): CardBrand {
  const n = digitsOnly(number);
  if (/^3[47]/.test(n)) return 'amex';
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  return 'unknown';
}

export function brandLabel(brand: CardBrand) {
  switch (brand) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'American Express';
    default:
      return 'Tarjeta';
  }
}

export function formatCardNumber(value: string) {
  const n = digitsOnly(value).slice(0, 19);
  if (detectCardBrand(n) === 'amex') {
    return n.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' '),
    );
  }
  return n.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiry(value: string) {
  const n = digitsOnly(value).slice(0, 4);
  if (n.length <= 2) return n;
  return `${n.slice(0, 2)}/${n.slice(2)}`;
}

export function validateCard(input: {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
}) {
  if (!input.holder.trim()) return 'Completá el nombre del titular.';
  const number = digitsOnly(input.number);
  const brand = detectCardBrand(number);
  const need = brand === 'amex' ? 15 : 16;
  if (number.length < need) return 'Revisá el número de la tarjeta.';
  const exp = digitsOnly(input.expiry);
  if (exp.length !== 4) return 'Completá el vencimiento (MM/AA).';
  const month = Number(exp.slice(0, 2));
  const year = 2000 + Number(exp.slice(2));
  if (month < 1 || month > 12) return 'El mes de vencimiento no es válido.';
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  if (end.getTime() < Date.now()) return 'La tarjeta está vencida.';
  const cvv = digitsOnly(input.cvv);
  const cvvLen = brand === 'amex' ? 4 : 3;
  if (cvv.length !== cvvLen) return brand === 'amex' ? 'El código tiene 4 dígitos.' : 'El código tiene 3 dígitos.';
  return '';
}
