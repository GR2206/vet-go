export const PRODUCT_PLACEHOLDER = '/product-placeholder.svg';

export function pickImage(onPick: (uri: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPick(String(reader.result));
    reader.readAsDataURL(file);
  };
  input.click();
}

export function moneyDigits(raw: string) {
  return Math.round(Number(raw.replace(/[^\d]/g, ''))) || 0;
}

export function when(at: number) {
  return new Date(at).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
