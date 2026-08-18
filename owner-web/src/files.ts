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

export function validateProductForPublish(product: {
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
}): string | null {
  const name = product.name.trim();
  if (name.length < 2 || name.toLowerCase() === 'nuevo producto') {
    return 'Poné un nombre al producto.';
  }
  if (!product.category.trim()) return 'Indicá el rubro.';
  if (!product.price || product.price <= 0) return 'Indicá un precio mayor a 0.';
  if (!product.image || product.image === PRODUCT_PLACEHOLDER) return 'Cargá una foto del producto.';
  if (!product.description.trim()) return 'Agregá una descripción.';
  return null;
}

export function when(at: number) {
  return new Date(at).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
