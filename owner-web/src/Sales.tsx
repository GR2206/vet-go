import { useState } from 'react';

import { startOfDay } from '@petsgo/lib/dates';
import { checkoutPayDetail, formatARS } from '@petsgo/lib/format';
import type { OrderRating } from '@petsgo/data/types';

import { when } from './files';
import { useOwner, type OwnerSale } from './store';

function money(n: number) {
  return formatARS(n);
}

function tally(list: OwnerSale[]) {
  return list.reduce(
    (acc, s) => ({
      count: acc.count + 1,
      gross: acc.gross + s.gross,
      fee: acc.fee + s.fee,
      net: acc.net + s.net,
    }),
    { count: 0, gross: 0, fee: 0, net: 0 },
  );
}

function starsLabel(n: number) {
  return `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}`;
}

function RatingBlock({ title, rating }: { title: string; rating: OrderRating }) {
  return (
    <div className="sale-rate">
      <p className="sale-rate-title">
        {title} · <span className="sale-stars">{starsLabel(rating.rating)}</span>
      </p>
      {rating.text ? <p className="sale-rate-text">“{rating.text}”</p> : <p className="muted">Sin comentario</p>}
      {rating.at ? <p className="muted">{when(rating.at)}</p> : null}
    </div>
  );
}

function BuyerRateForm({ orderId }: { orderId: string }) {
  const { rateBuyer } = useOwner();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');

  if (!open) {
    return (
      <button type="button" className="ghost" onClick={() => setOpen(true)}>
        Calificar comprador ⭐
      </button>
    );
  }

  return (
    <div className="sale-rate-form">
      <p className="sale-rate-title">⭐ Calificar al comprador</p>
      <div className="sale-star-pick">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className="sale-star-hit" onClick={() => setStars(n)}>
            {n <= stars ? '★' : '☆'}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Comentario (opcional)"
      />
      <div className="sale-rate-actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            rateBuyer(orderId, { rating: stars, text: text.trim() });
            setOpen(false);
          }}
        >
          Enviar 📬
        </button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function SaleCard({ order, variant }: { order: OwnerSale; variant: 'live' | 'history' }) {
  const { confirmOrder, deleteSale, restoreSale } = useOwner();
  const pending = order.status === 'awaiting_confirm';
  const confirmed = !pending;
  return (
    <li className={`card sale-card${order.archived ? ' dim' : ''}${pending ? ' sale-pending' : ''}`}>
      <div className="sale-top">
        <div>
          <p className="card-title">{order.shipping?.fullName || order.buyer}</p>
          <p className="muted">
            {when(order.paidAt)} · {checkoutPayDetail(order)}
            {order.archived ? ' · En historial' : null}
          </p>
        </div>
        <p className="price">{money(order.gross)}</p>
      </div>
      <ul className="sale-items">
        {order.items.map((item, i) => (
          <li key={`${order.id}-${i}`}>
            <span>
              {item.qty}× {item.name}
            </span>
            <span>{money(item.qty * item.unitPrice)}</span>
          </li>
        ))}
      </ul>
      <p className="muted sale-cut">
        Comisión {money(order.fee)} · neto {money(order.net)}
      </p>
      <p className="muted sale-ship">
        {order.shipping.street} {order.shipping.number}
        {order.shipping.floor ? ` ${order.shipping.floor}` : ''} · {order.shipping.neighborhood} ·{' '}
        {order.shipping.phone}
      </p>
      {confirmed ? <p className="ok">✅ Pedido confirmado correctamente.</p> : null}
      {order.deliveryStatus === 'received' || order.receivedAt ? (
        <p className="ok">📦 El tutor confirmó que el producto llegó bien.</p>
      ) : null}
      {order.tutorRating ? (
        <RatingBlock title="⭐ Calificación del tutor" rating={order.tutorRating} />
      ) : null}
      {order.buyerRating ? (
        <RatingBlock title="🧡 Tu calificación al comprador" rating={order.buyerRating} />
      ) : confirmed && variant === 'live' && !order.archived ? (
        <BuyerRateForm orderId={order.id} />
      ) : null}
      <div className="sale-actions">
        {variant === 'live' && order.status === 'awaiting_confirm' ? (
          <button type="button" className="primary" onClick={() => confirmOrder(order.id)}>
            ✅ Confirmar pedido
          </button>
        ) : null}
        {variant === 'live' ? (
          <button type="button" className="danger" onClick={() => deleteSale(order.id)}>
            🗑️ Eliminar
          </button>
        ) : order.archived ? (
          <button type="button" className="primary" onClick={() => restoreSale(order.id)}>
            ♻️ Restaurar
          </button>
        ) : (
          <span className="muted">📌 En Ventas</span>
        )}
      </div>
    </li>
  );
}

export function Sales() {
  const { liveSales, salesHistory, salesAutoExpire, setSalesAutoExpire } = useOwner();
  const now = Date.now();
  const dayStart = startOfDay(now);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const day = tally(salesHistory.filter((s) => s.paidAt >= dayStart));
  const month = tally(salesHistory.filter((s) => s.paidAt >= monthStart.getTime()));

  return (
    <section>
      <div className="chat-head">
        <div>
          <h1>🛒 Ventas Market</h1>
        </div>
        <div className="chat-tools">
          <button
            type="button"
            className={salesAutoExpire ? 'ghost' : 'primary'}
            onClick={() => setSalesAutoExpire(!salesAutoExpire)}
          >
            {salesAutoExpire ? '⏳ Caducidad 30 días: on' : '♾️ Caducidad anulada'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() =>
              window.open(`${window.location.pathname}#/historial-ventas`, '_blank', 'noopener')
            }
          >
            📜 Historial 30 días
          </button>
        </div>
      </div>
      <p className="muted">
        {salesAutoExpire
          ? 'Las compras se borran solas a los 30 días, de la más vieja a la más nueva. Anulá la caducidad si querés guardarlas.'
          : 'La caducidad está anulada: el historial de compras no se borra solo.'}
      </p>
      {liveSales.length === 0 ? (
        <p className="muted">💤 No hay pedidos activos. Los eliminados están en el historial.</p>
      ) : (
        <ul className="list sales-grid">
          {liveSales.map((order) => (
            <SaleCard key={order.id} order={order} variant="live" />
          ))}
        </ul>
      )}
      <div className="sale-balances">
        <article className="card sale-balance">
          <p className="stat-label">☀️ Hoy</p>
          <p className="stat-value">{money(day.net)}</p>
          <p className="stat-hint">
            {day.count} · {money(day.gross)} bruto
          </p>
        </article>
        <article className="card sale-balance">
          <p className="stat-label">📆 Mes</p>
          <p className="stat-value">{money(month.net)}</p>
          <p className="stat-hint">
            {month.count} · {money(month.gross)} bruto
          </p>
        </article>
      </div>
    </section>
  );
}
