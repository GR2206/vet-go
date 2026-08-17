import { parseCatalogRows, type SheetProductRow } from '@petsgo/lib/sheet-catalog';

async function rowsFromBuffer(buf: ArrayBuffer): Promise<SheetProductRow[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  return parseCatalogRows(raw);
}

export async function readCatalogFile(file: File) {
  return rowsFromBuffer(await file.arrayBuffer());
}

export async function readCatalogUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo leer el enlace');
  return rowsFromBuffer(await res.arrayBuffer());
}
