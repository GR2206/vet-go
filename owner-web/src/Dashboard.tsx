import { useEffect, useRef, useState } from 'react';

import { kindLabel } from '@petsgo/lib/format';

import { Catalog } from './Catalog';
import { Chat } from './Chat';
import { Local } from './Local';
import { Offers } from './Offers';
import { Sales } from './Sales';
import { CrispImg } from './ui/CrispImg';
import { useOwner, type Tab } from './store';
import { Support } from './Support';
import { Team } from './Team';
import { TurnosCal } from './TurnosCal';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'ofertas', label: 'Ofertas' },
  { id: 'turnos', label: 'Turnos' },
  { id: 'equipo', label: 'Equipo' },
  { id: 'chat', label: 'Chat' },
  { id: 'local', label: 'Local' },
  { id: 'soporte', label: 'Soporte' },
];

export function Dashboard() {
  const { shop, logout, tab, setTab, unreadChatCount, unreadSalesCount } = useOwner();
  if (!shop) return null;

  return (
    <div className="shell">
      <aside className="side">
        <div className="side-logo-wrap">
          <CrispImg src="/logo.png" alt="PETS&GO" logo decoding="sync" fetchPriority="high" />
        </div>
        <p className="side-kicker">Dueños · Rosario</p>
        <h2 className="side-shop">{shop.name}</h2>
        <p className="side-meta">
          {kindLabel(shop.kind)} · {shop.neighborhood}
        </p>
        <nav>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'nav on' : 'nav'}
              onClick={() => setTab(item.id)}
            >
              <span>{item.label}</span>
              {item.id === 'chat' && unreadChatCount > 0 ? (
                <span className="nav-badge">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>
              ) : null}
              {item.id === 'ventas' && unreadSalesCount > 0 ? (
                <span className="nav-badge">{unreadSalesCount > 9 ? '9+' : unreadSalesCount}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <button type="button" className="ghost logout" onClick={logout}>
          Salir
        </button>
      </aside>
      <main className="main">
        <ToastStack />
        {tab === 'resumen' ? <Resumen /> : null}
        {tab === 'ventas' ? <Sales /> : null}
        {tab === 'catalogo' ? <Catalog /> : null}
        {tab === 'ofertas' ? <Offers /> : null}
        {tab === 'turnos' ? <TurnosCal /> : null}
        {tab === 'equipo' ? <Team /> : null}
        {tab === 'chat' ? <Chat /> : null}
        {tab === 'local' ? <Local /> : null}
        {tab === 'soporte' ? <Support /> : null}
      </main>
    </div>
  );
}

function ToastStack() {
  const { notices, dismissNotice } = useOwner();
  const [leaving, setLeaving] = useState<Record<string, boolean>>({});
  const armed = useRef(new Set<string>());

  useEffect(() => {
    const visible = notices.slice(0, 3);
    for (const notice of visible) {
      if (armed.current.has(notice.id)) continue;
      armed.current.add(notice.id);
      const hold = 6200 + Math.floor(Math.random() * 1600);
      window.setTimeout(() => {
        setLeaving((prev) => ({ ...prev, [notice.id]: true }));
        window.setTimeout(() => {
          dismissNotice(notice.id);
          armed.current.delete(notice.id);
          setLeaving((prev) => {
            const next = { ...prev };
            delete next[notice.id];
            return next;
          });
        }, 1200);
      }, hold);
    }
  }, [notices, dismissNotice]);

  useEffect(
    () => () => {
      armed.current.clear();
    },
    [],
  );

  const visible = notices.slice(0, 3);
  if (!visible.length) return null;

  return (
    <div className="toasts" aria-live="polite">
      {visible.map((n) => (
        <aside key={n.id} className={`toast${leaving[n.id] ? ' toast-out' : ''}`}>
          <span className="toast-bar" aria-hidden />
          <p>{n.text}</p>
          <button
            type="button"
            className="link"
            onClick={() => {
              setLeaving((prev) => ({ ...prev, [n.id]: true }));
              window.setTimeout(() => dismissNotice(n.id), 1200);
            }}
          >
            Cerrar
          </button>
        </aside>
      ))}
    </div>
  );
}

function Resumen() {
  const { shop, sales, catalog, paused, inbox, appointments, todayOffers, unreadChatCount, stockAsks, dismissAsk, setTab } =
    useOwner();
  if (!shop) return null;
  const wait = sales.filter((s) => !s.archived && s.status === 'awaiting_confirm').length;
  const pendingTurnos = appointments.filter((a) => !a.taken && sameDayNow(a.at)).length;
  const liveCat = catalog.filter((p) => !paused[p.id]);
  const out = liveCat.filter((p) => p.stock <= 0);
  const critical = liveCat.filter((p) => p.stock > 0 && p.stock <= 5);
  const low = liveCat.filter((p) => p.stock > 5 && p.stock <= 10);

  return (
    <section>
      <h1>Hola, {shop.name}</h1>
      {stockAsks.length || out.length || critical.length || low.length ? (
        <div className="stock-alerts">
          {stockAsks.map((a) => (
            <button
              key={a.id}
              type="button"
              className="stock-alert red"
              onClick={() => {
                dismissAsk(a.id);
                setTab('catalogo');
              }}
            >
              <p className="stock-alert-kicker">Sin stock</p>
              <p>
                {a.tutorName} pidió {a.productName} · sin stock
              </p>
            </button>
          ))}
          {out.map((p) => (
            <button key={p.id} type="button" className="stock-alert red" onClick={() => setTab('catalogo')}>
              <p className="stock-alert-kicker">Sin unidades</p>
              <p>Reponer {p.name}</p>
            </button>
          ))}
          {critical.map((p) => (
            <button key={p.id} type="button" className="stock-alert red" onClick={() => setTab('catalogo')}>
              <p className="stock-alert-kicker">Pocas unidades</p>
              <p>Menos de 5 · reponer {p.name}</p>
            </button>
          ))}
          {low.map((p) => (
            <button key={p.id} type="button" className="stock-alert orange" onClick={() => setTab('catalogo')}>
              <p className="stock-alert-kicker">Stock bajo</p>
              <p>
                {p.stock} u. · reponer {p.name}
              </p>
            </button>
          ))}
        </div>
      ) : null}
      <div className="stats">
        <button
          type="button"
          className={wait ? 'stat go alert-sale' : 'stat go'}
          onClick={() => setTab('ventas')}
        >
          <p className="stat-label">Ventas</p>
          <p className="stat-value">{wait}</p>
          <p className="stat-hint">{wait ? 'pedidos por confirmar' : 'sin pedidos nuevos'}</p>
        </button>
        <button type="button" className="stat go" onClick={() => setTab('catalogo')}>
          <p className="stat-label">Catálogo</p>
          <p className="stat-value">{catalog.length}</p>
          <p className="stat-hint">productos en Market</p>
        </button>
        <button type="button" className="stat go" onClick={() => setTab('ofertas')}>
          <p className="stat-label">Ofertas hoy</p>
          <p className="stat-value">{todayOffers.length}</p>
          <p className="stat-hint">salen en Inicio del tutor</p>
        </button>
        <button
          type="button"
          className={unreadChatCount ? 'stat go alert-chat' : 'stat go'}
          onClick={() => setTab('chat')}
        >
          <p className="stat-label">Chats</p>
          <p className="stat-value">{unreadChatCount || inbox.length}</p>
          <p className="stat-hint">
            {unreadChatCount
              ? `${unreadChatCount} nuevo${unreadChatCount === 1 ? '' : 's'}`
              : `${inbox.length} activos`}
          </p>
        </button>
        <button
          type="button"
          className={pendingTurnos ? 'stat go alert-turnos' : 'stat go'}
          onClick={() => setTab('turnos')}
        >
          <p className="stat-label">Turnos</p>
          <p className="stat-value">{pendingTurnos}</p>
          <p className="stat-hint">{pendingTurnos ? 'por atender hoy' : 'nada pendiente hoy'}</p>
        </button>
      </div>
    </section>
  );
}

function sameDayNow(at: number) {
  const a = new Date(at);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
