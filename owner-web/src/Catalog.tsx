import { useState } from 'react';

import { formatARS } from '@petsgo/lib/format';

import { moneyDigits, pickImage, PRODUCT_PLACEHOLDER } from './files';
import { readCatalogFile, readCatalogUrl } from './read-sheet';
import { useOwner } from './store';

export function Catalog() {
  const { catalog, paused, togglePaused, updateProduct, addProduct, importSheet } = useOwner();
  const [q, setQ] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const query = q.trim().toLowerCase();
  const list = catalog.filter(
    (p) =>
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query),
  );

  const ingest = async (rows: Awaited<ReturnType<typeof readCatalogFile>>) => {
    if (!rows.length) {
      setErr('No encontré filas con columna Nombre / Producto.');
      return;
    }
    const stats = importSheet(rows);
    setErr('');
    setNote(
      `Listo: ${stats.updated} actualizados, ${stats.added} nuevos. ${stats.withPhoto} con foto, ${stats.withoutPhoto} sin foto (cargala acá abajo).`,
    );
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      await ingest(await readCatalogFile(file));
    } catch {
      setErr('No pude leer ese archivo. Probá .xlsx, .xls o .csv.');
    } finally {
      setBusy(false);
    }
  };

  const onUrl = async () => {
    const url = sheetUrl.trim();
    if (!url) return;
    setBusy(true);
    setErr('');
    try {
      await ingest(await readCatalogUrl(url));
    } catch {
      setErr('El enlace no se pudo leer (Google a veces bloquea). Exportá Excel y arrastralo acá.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1>Catálogo</h1>

      <label className="sr">Buscar producto</label>
      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, rubro o descripción…"
      />

      <div
        className={drag ? 'drop on' : 'drop'}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void onFile(e.dataTransfer.files[0]);
        }}
      >
        <p className="drop-title">Cajón de planilla</p>
        <p>
          Arrastrá un Excel o CSV con columnas: <b>nombre</b>, <b>precio</b>, <b>stock</b>,{' '}
          <b>descripcion</b>. Opcional: categoria, unidad, foto (URL), especie, descuento, sku.
        </p>
        <p className="muted">
          Si el producto ya existe (mismo nombre o código) se actualiza el precio y el stock. Si
          trae foto, se usa; si no, queda para cargar a mano.
        </p>
        <div className="drop-actions">
          <label className="primary file-btn">
            Elegir archivo
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              hidden
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <a className="ghost" href="/plantilla-catalogo.csv" download>
            Bajar plantilla
          </a>
        </div>
        <div className="sheet-url">
          <input
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="O pegá un Google Sheet publicado como CSV"
          />
          <button type="button" className="ghost" disabled={busy} onClick={() => void onUrl()}>
            Leer sheet
          </button>
        </div>
        {busy ? <p className="muted">Leyendo…</p> : null}
        {note ? <p className="ok">{note}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </div>

      <div className="toolbar">
        <button type="button" className="primary" onClick={addProduct}>
          Nuevo producto
        </button>
        <p className="muted">
          {list.length} de {catalog.length}
        </p>
      </div>

      {catalog.length === 0 ? (
        <p className="muted">Este local todavía no tiene productos. Cargá la planilla o creá uno.</p>
      ) : list.length === 0 ? (
        <p className="muted">Ningún producto coincide con “{q}”.</p>
      ) : (
        <ul className="list">
          {list.map((p) => (
            <li key={p.id} className={paused[p.id] ? 'card editor dim' : 'card editor'}>
              <button
                type="button"
                className="thumb-btn"
                onClick={() => pickImage((uri) => updateProduct(p.id, { image: uri }))}
              >
                <img src={p.image || PRODUCT_PLACEHOLDER} alt="" />
                <span>{p.image && p.image !== PRODUCT_PLACEHOLDER ? 'Cambiar foto' : 'Cargar foto'}</span>
              </button>
              <div className="fields">
                <label>
                  Nombre
                  <input value={p.name} onChange={(e) => updateProduct(p.id, { name: e.target.value })} />
                </label>
                <label>
                  Rubro
                  <input
                    value={p.category}
                    onChange={(e) => updateProduct(p.id, { category: e.target.value })}
                  />
                </label>
                <label>
                  Precio del día
                  <input
                    inputMode="numeric"
                    value={p.price ? String(p.price) : ''}
                    onChange={(e) => updateProduct(p.id, { price: moneyDigits(e.target.value) })}
                  />
                </label>
                <label>
                  Stock
                  <input
                    inputMode="numeric"
                    value={String(p.stock)}
                    onChange={(e) => updateProduct(p.id, { stock: moneyDigits(e.target.value) })}
                  />
                </label>
                <label>
                  Unidad
                  <input value={p.unit} onChange={(e) => updateProduct(p.id, { unit: e.target.value })} />
                </label>
                <label>
                  Especie
                  <select
                    value={p.species ?? 'all'}
                    onChange={(e) =>
                      updateProduct(p.id, { species: e.target.value as 'dog' | 'cat' | 'all' })
                    }
                  >
                    <option value="all">Todos</option>
                    <option value="dog">Perro</option>
                    <option value="cat">Gato</option>
                  </select>
                </label>
                <label className="span-2">
                  Descripción
                  <textarea
                    rows={2}
                    value={p.description}
                    onChange={(e) => updateProduct(p.id, { description: e.target.value })}
                  />
                </label>
                <p className="muted span-2">
                  {p.price ? formatARS(p.price) : 'Sin precio'}
                  {p.discountPct ? ` · oferta ${p.discountPct}% OFF` : ''}
                </p>
              </div>
              <button type="button" className="ghost" onClick={() => togglePaused(p.id)}>
                {paused[p.id] ? 'Reactivar' : 'Pausar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
