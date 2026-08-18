import { useState } from 'react';

import { formatARS } from '@petsgo/lib/format';
import { applyOffersToProducts } from '@petsgo/lib/offers';

import { moneyDigits, PRODUCT_PLACEHOLDER } from './files';
import { CrispImg } from './ui/CrispImg';
import { useOwner } from './store';

export function Offers() {
  const { catalog, todayOffers, publishOffer, unpublishOffer, shop } = useOwner();
  const [q, setQ] = useState('');
  const [pct, setPct] = useState<Record<string, string>>({});
  const [label, setLabel] = useState<Record<string, string>>({});

  const query = q.trim().toLowerCase();
  const list = catalog.filter(
    (p) => !query || p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query),
  );
  const preview = applyOffersToProducts(catalog, todayOffers).filter((p) => (p.discountPct ?? 0) > 0);

  return (
    <section>
      <h1>🏷️ Ofertas del día</h1>

      {preview.length ? (
        <div className="tutor-preview">
          <p className="kicker">👀 Así lo ve el tutor hoy</p>
          {preview.slice(0, 4).map((p) => (
            <article key={p.id} className="tutor-card">
              <CrispImg src={p.image || PRODUCT_PLACEHOLDER} alt="" photo />
              <div>
                <p className="off-kicker">{p.discountPct}% OFF</p>
                <p className="card-title">{p.name}</p>
                <p className="muted">
                  {shop?.name} · {formatARS(p.price)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">💤 Todavía no hay ofertas vivas para hoy.</p>
      )}

      {todayOffers.length ? (
        <ul className="list">
          {todayOffers.map((o) => {
            const product = catalog.find((p) => p.id === o.productId);
            return (
              <li key={o.id} className="card row">
                <div>
                  <p className="card-title">{product?.name ?? o.productId}</p>
                  <p className="muted">
                    {o.discountPct}% OFF{o.label ? ` · ${o.label}` : ''} · hasta las 23:59
                  </p>
                </div>
                <button type="button" className="ghost" onClick={() => unpublishOffer(o.id)}>
                  ❌ Sacar
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <h2 className="subhead">🚀 Publicar</h2>
      <input
        className="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar producto para ofertar…"
      />
      <ul className="list">
        {list.map((p) => (
          <li key={p.id} className="card offer-row">
            <CrispImg src={p.image || PRODUCT_PLACEHOLDER} alt="" photo />
            <div>
              <p className="card-title">{p.name}</p>
              <p className="muted">{formatARS(p.price)}</p>
            </div>
            <input
              className="pct"
              inputMode="numeric"
              placeholder="%"
              value={pct[p.id] ?? (p.discountPct ? String(p.discountPct) : '')}
              onChange={(e) => setPct((prev) => ({ ...prev, [p.id]: e.target.value }))}
            />
            <input
              placeholder="Texto corto (opcional)"
              value={label[p.id] ?? ''}
              onChange={(e) => setLabel((prev) => ({ ...prev, [p.id]: e.target.value }))}
            />
            <button
              type="button"
              className="primary"
              onClick={() => {
                const n = moneyDigits(pct[p.id] ?? String(p.discountPct ?? 0));
                if (n <= 0 || n >= 100) return;
                publishOffer(p.id, n, label[p.id]);
              }}
            >
              🚀 Publicar hoy
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
