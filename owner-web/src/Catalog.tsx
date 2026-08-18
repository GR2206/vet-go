import { useState } from 'react';

import { formatARS } from '@petsgo/lib/format';
import type { Product } from '@petsgo/data/types';

import { moneyDigits, pickImage, PRODUCT_PLACEHOLDER } from './files';
import { readCatalogFile, readCatalogUrl } from './read-sheet';
import { CrispImg } from './ui/CrispImg';
import { useOwner } from './store';

function ProductFields({
  product,
  onUpdate,
}: {
  product: Product;
  onUpdate: (patch: Partial<Product>) => void;
}) {
  return (
    <>
      <button
        type="button"
        className="thumb-btn"
        onClick={() => pickImage((uri) => onUpdate({ image: uri }))}
      >
        <CrispImg src={product.image || PRODUCT_PLACEHOLDER} alt="" photo />
        <span>{product.image && product.image !== PRODUCT_PLACEHOLDER ? '📷 Cambiar foto' : '📷 Cargar foto'}</span>
      </button>
      <div className="fields">
        <label>
          Nombre
          <input value={product.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        </label>
        <label>
          Rubro
          <input value={product.category} onChange={(e) => onUpdate({ category: e.target.value })} />
        </label>
        <label>
          Precio del día
          <input
            inputMode="numeric"
            value={product.price ? String(product.price) : ''}
            onChange={(e) => onUpdate({ price: moneyDigits(e.target.value) })}
          />
        </label>
        <label>
          Stock
          <input
            inputMode="numeric"
            value={String(product.stock)}
            onChange={(e) => onUpdate({ stock: moneyDigits(e.target.value) })}
          />
        </label>
        <label>
          Unidad
          <input value={product.unit} onChange={(e) => onUpdate({ unit: e.target.value })} />
        </label>
        <label>
          Especie
          <select
            value={product.species ?? 'all'}
            onChange={(e) => onUpdate({ species: e.target.value as 'dog' | 'cat' | 'all' })}
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
            value={product.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </label>
        <p className="muted span-2">
          {product.price ? formatARS(product.price) : 'Sin precio'}
          {product.discountPct ? ` · oferta ${product.discountPct}% OFF` : ''}
        </p>
      </div>
    </>
  );
}

export function Catalog() {
  const {
    catalog,
    drafts,
    paused,
    togglePaused,
    updateProduct,
    addProduct,
    updateDraft,
    publishDraft,
    discardDraft,
    importSheet,
  } = useOwner();
  const [q, setQ] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [draftErr, setDraftErr] = useState<Record<string, string>>({});
  const [publishedNote, setPublishedNote] = useState('');

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
      `Listo: ${stats.updated} actualizados, ${stats.added} nuevos publicados. ${stats.withPhoto} con foto, ${stats.withoutPhoto} sin foto (cargala acá abajo).`,
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

  const onPublish = (id: string) => {
    const result = publishDraft(id);
    if (!result.ok) {
      setDraftErr((prev) => ({ ...prev, [id]: result.error }));
      return;
    }
    setDraftErr((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPublishedNote('Producto publicado. Ya lo ven los tutores en la app.');
    window.setTimeout(() => setPublishedNote(''), 4000);
  };

  return (
    <section>
      <h1>📦 Catálogo</h1>
      <p className="muted">
        Cargá foto y datos del producto. Recién al tocar <b>Publicar</b> aparece en la tienda de la app.
      </p>

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
        <p className="drop-title">📥 Cajón de planilla</p>
        <p>
          Arrastrá un Excel o CSV con columnas: <b>nombre</b>, <b>precio</b>, <b>stock</b>,{' '}
          <b>descripcion</b>. Opcional: categoria, unidad, foto (URL), especie, descuento, sku.
        </p>
        <p className="muted">
          Si el producto ya existe (mismo nombre o código) se actualiza el precio y el stock. La planilla
          publica directo en Market; para uno a mano usá <b>Nuevo producto</b> abajo.
        </p>
        <div className="drop-actions">
          <label className="primary file-btn">
            📁 Elegir archivo
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
            ⬇️ Bajar plantilla
          </a>
        </div>
        <div className="sheet-url">
          <input
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="O pegá un Google Sheet publicado como CSV"
          />
          <button type="button" className="ghost" disabled={busy} onClick={() => void onUrl()}>
            🔗 Leer sheet
          </button>
        </div>
        {busy ? <p className="muted">Leyendo…</p> : null}
        {note ? <p className="ok">{note}</p> : null}
        {err ? <p className="err">{err}</p> : null}
      </div>

      <div className="toolbar">
        <button type="button" className="primary" onClick={addProduct}>
          ➕ Nuevo producto
        </button>
        <p className="muted">
          {list.length} publicados
          {drafts.length ? ` · ${drafts.length} sin publicar` : ''}
        </p>
      </div>

      {publishedNote ? <p className="ok">{publishedNote}</p> : null}

      {drafts.length ? (
        <>
          <h2 className="section-h2">📝 Sin publicar</h2>
          <p className="muted">Estos productos no los ve el tutor hasta que confirmes con Publicar.</p>
          <ul className="list">
            {drafts.map((p) => (
              <li key={p.id} className="card editor draft">
                <ProductFields product={p} onUpdate={(patch) => updateDraft(p.id, patch)} />
                <div className="draft-actions">
                  <button type="button" className="primary" onClick={() => onPublish(p.id)}>
                    🚀 Publicar
                  </button>
                  <button type="button" className="ghost" onClick={() => discardDraft(p.id)}>
                    🗑️ Descartar
                  </button>
                  {draftErr[p.id] ? <p className="err draft-err">{draftErr[p.id]}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {catalog.length === 0 && drafts.length === 0 ? (
        <p className="muted">🛒 Este local todavía no tiene productos. Cargá la planilla o creá uno.</p>
      ) : catalog.length > 0 && list.length === 0 ? (
        <p className="muted">Ningún producto publicado coincide con “{q}”.</p>
      ) : list.length ? (
        <>
          <h2 className="section-h2">🏪 En la tienda</h2>
          <ul className="list">
            {list.map((p) => (
              <li key={p.id} className={paused[p.id] ? 'card editor dim' : 'card editor'}>
                <ProductFields product={p} onUpdate={(patch) => updateProduct(p.id, patch)} />
                <button type="button" className="ghost" onClick={() => togglePaused(p.id)}>
                  {paused[p.id] ? '▶️ Reactivar' : '⏸️ Pausar'}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
