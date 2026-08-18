import { SaleCard } from './Sales';
import { CrispImg } from './ui/CrispImg';
import { useOwner } from './store';

export function HistorySales() {
  const { shop, salesHistory, logout } = useOwner();
  if (!shop) return null;

  return (
    <div className="history-page">
      <header className="history-bar">
        <CrispImg src="/logo.png" alt="PETS&GO" logo decoding="sync" />
        <div>
          <p className="kicker">📜 Historial de compras</p>
          <h1>{shop.name}</h1>
        </div>
        <a className="ghost" href="#/">
          ↩️ Volver al panel
        </a>
        <button type="button" className="ghost" onClick={logout}>
          🚪 Salir
        </button>
      </header>
      <ul className="list sales-grid sales-history">
        {salesHistory.length === 0 ? <p className="muted">💤 No hay compras en este período.</p> : null}
        {salesHistory.map((order) => (
          <SaleCard key={order.id} order={order} variant="history" />
        ))}
      </ul>
    </div>
  );
}
