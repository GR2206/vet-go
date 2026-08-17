import type { Product, Species } from '../data/types';

export type SheetProductRow = {
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  unit: string;
  image: string;
  species: Species | 'all';
  discountPct?: number;
};

export type SheetMergeStats = {
  catalog: Product[];
  added: number;
  updated: number;
  withPhoto: number;
  withoutPhoto: number;
};

const NAME_KEYS = ['nombre', 'producto', 'name', 'item', 'articulo'];
const DESC_KEYS = ['descripcion', 'detalle', 'desc', 'texto'];
const PRICE_KEYS = ['precio', 'price', 'pvp', 'lista', 'importe'];
const STOCK_KEYS = ['stock', 'cantidad', 'cant', 'existencia', 'unidades'];
const CAT_KEYS = ['categoria', 'rubro', 'seccion'];
const UNIT_KEYS = ['unidad', 'unit', 'um', 'presentacion'];
const PHOTO_KEYS = ['foto', 'imagen', 'image', 'url', 'urlfoto', 'linkfoto', 'fotourl'];
const SPECIES_KEYS = ['especie', 'species', 'mascota', 'tipo'];
const OFF_KEYS = ['descuento', 'dto', 'oferta', 'off'];
const SKU_KEYS = ['sku', 'codigo', 'id', 'cod', 'ean'];

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function slug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function pick(row: Record<string, unknown>, keys: string[]) {
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) map.set(fold(k), v);
  for (const key of keys) {
    const hit = map.get(key);
    if (hit != null && String(hit).trim()) return String(hit).trim();
  }
  return '';
}

function money(raw: string) {
  const compact = raw.replace(/\s/g, '').replace(/^\$/, '');
  if (!compact) return 0;
  if (compact.includes(',') && compact.includes('.')) {
    return Math.round(Number(compact.replace(/\./g, '').replace(',', '.'))) || 0;
  }
  if (compact.includes(',')) {
    const [pesos, cents] = compact.split(',');
    if (cents && cents.length <= 2) return Math.round(Number(pesos.replace(/\./g, '')) || 0);
  }
  return Math.round(Number(compact.replace(/[^\d]/g, ''))) || 0;
}

function qty(raw: string) {
  return Math.max(0, Math.round(Number(raw.replace(/[^\d]/g, ''))) || 0);
}

function speciesOf(raw: string): Species | 'all' {
  const k = fold(raw);
  if (k.startsWith('perr') || k === 'dog' || k === 'canino') return 'dog';
  if (k.startsWith('gat') || k === 'cat' || k === 'felino') return 'cat';
  return 'all';
}

export function parseCatalogRows(rows: Record<string, unknown>[]): SheetProductRow[] {
  const out: SheetProductRow[] = [];
  for (const row of rows) {
    const name = pick(row, NAME_KEYS);
    if (!name) continue;
    const offRaw = pick(row, OFF_KEYS);
    const off = offRaw ? Math.min(90, qty(offRaw)) : 0;
    const parsed: SheetProductRow = {
      sku: pick(row, SKU_KEYS),
      name,
      description: pick(row, DESC_KEYS),
      price: money(pick(row, PRICE_KEYS)),
      stock: qty(pick(row, STOCK_KEYS)),
      category: pick(row, CAT_KEYS) || 'General',
      unit: pick(row, UNIT_KEYS) || 'u',
      image: pick(row, PHOTO_KEYS),
      species: speciesOf(pick(row, SPECIES_KEYS)),
    };
    if (off > 0) parsed.discountPct = off;
    out.push(parsed);
  }
  return out;
}

export function mergeSheetProducts(
  existing: Product[],
  incoming: SheetProductRow[],
  shopId: string,
  placeholder: string,
): SheetMergeStats {
  const catalog = existing.map((p) => ({ ...p }));
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const byName = new Map(catalog.map((p) => [fold(p.name), p]));
  let added = 0;
  let updated = 0;
  let withPhoto = 0;
  let withoutPhoto = 0;

  for (const row of incoming) {
    const match = (row.sku && byId.get(row.sku)) || byName.get(fold(row.name));
    const photo = row.image;
    if (photo) withPhoto += 1;
    else withoutPhoto += 1;

    if (match) {
      match.name = row.name;
      if (row.description) match.description = row.description;
      if (row.price > 0) match.price = row.price;
      match.stock = row.stock;
      if (row.category) match.category = row.category;
      if (row.unit) match.unit = row.unit;
      if (photo) match.image = photo;
      if (row.species) match.species = row.species;
      if (row.discountPct) match.discountPct = row.discountPct;
      updated += 1;
      continue;
    }

    const product: Product = {
      id: row.sku || `imp-${slug(row.name) || 'item'}-${Date.now().toString(36)}`,
      shopId,
      name: row.name,
      category: row.category,
      price: row.price,
      stock: row.stock,
      unit: row.unit,
      image: photo || placeholder,
      description: row.description,
      sold: 0,
      species: row.species,
      discountPct: row.discountPct,
    };
    catalog.push(product);
    byId.set(product.id, product);
    byName.set(fold(product.name), product);
    added += 1;
  }

  return { catalog, added, updated, withPhoto, withoutPhoto };
}
