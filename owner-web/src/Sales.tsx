import { startOfDay } from '@petsgo/lib/dates';
import { formatARS, paymentLabel } from '@petsgo/lib/format';

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

export function SaleCard({ order, variant }: { order: OwnerSale; variant: 'live' | 'history' }) {
  const { confirmOrder, deleteSale, restoreSale } = useOwner();
  const confirmed = order.status !== 'awaiting_confirm';
  return (
    <li className={`card sale-card${order.archived ? ' dim' : ''}`}>
      <div className="sale-top">
        <div>
          <p className="card-title">{order.shipping.fullName}</p>
          <p className="muted">
            {when(order.paidAt)} · {paymentLabel(order.method)}
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
      {confirmed ? <p className="ok">Pedido confirmado correctamente.</p> : null}
      <div className="sale-actions">
        {variant === 'live' && order.status === 'awaiting_confirm' ? (
          <button type="button" className="primary" onClick={() => confirmOrder(order.id)}>
            Confirmar pedido
          </button>
        ) : null}
        {variant === 'live' ? (
          <button type="button" className="danger" onClick={() => deleteSale(order.id)}>
            Eliminar
          </button>
        ) : order.archived ? (
          <button type="button" className="primary" onClick={() => restoreSale(order.id)}>
            Restaurar
          </button>
        ) : (
          <span className="muted">En Ventas</span>
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
          <h1>Ventas Market</h1>
        </div>
        <div className="chat-tools">
          <button
            type="button"
            className={salesAutoExpire ? 'ghost' : 'primary'}
            onClick={() => setSalesAutoExpire(!salesAutoExpire)}
          >
            {salesAutoExpire ? 'Caducidad 30 días: on' : 'Caducidad anulada'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() =>
              window.open(`${window.location.pathname}#/historial-ventas`, '_blank', 'noopener')
            }
          >
            Historial 30 días
          </button>
        </div>
      </div>
      <p className="muted">
        {salesAutoExpire
          ? 'Las compras se borran solas a los 30 días, de la más vieja a la más nueva. Anulá la caducidad si querés guardarlas.'
          : 'La caducidad está anulada: el historial de compras no se borra solo.'}
      </p>
      {liveSales.length === 0 ? (
        <p className="muted">No hay pedidos activos. Los eliminados están en el historial.</p>
      ) : (
        <ul className="list sales-grid">
          {liveSales.map((order) => (
            <SaleCard key={order.id} order={order} variant="live" />
          ))}
        </ul>
      )}
      <div className="sale-balances">
        <article className="card sale-balance">
          <p className="stat-label">Hoy</p>
          <p className="stat-value">{money(day.net)}</p>
          <p className="stat-hint">
            {day.count} · {money(day.gross)} bruto
          </p>
        </article>
        <article className="card sale-balance">
          <p className="stat-label">Mes</p>
          <p className="stat-value">{money(month.net)}</p>
          <p className="stat-hint">
            {month.count} · {money(month.gross)} bruto
          </p>
        </article>
      </div>
    </section>
  );
}
