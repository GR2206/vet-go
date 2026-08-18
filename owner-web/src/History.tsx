import { useState } from 'react';

import { when } from './files';
import { CrispImg } from './ui/CrispImg';
import { useOwner } from './store';

export function History() {
  const { shop, history, logout, openThread, setTab } = useOwner();
  const [openId, setOpenId] = useState<string | null>(null);

  const goPanel = (threadId: string) => {
    openThread(threadId);
    setTab('chat');
    window.location.hash = '#/';
  };

  if (!shop) return null;
  const current = history.find((t) => t.id === openId);

  return (
    <div className="history-page">
      <header className="history-bar">
        <CrispImg src="/logo.png" alt="PETS&GO" logo decoding="sync" />
        <div>
          <p className="kicker">Historial 30 días</p>
          <h1>{shop.name}</h1>
        </div>
        <a className="ghost" href="#/">
          Volver al panel
        </a>
        <button type="button" className="ghost" onClick={logout}>
          Salir
        </button>
      </header>
      <div className="history-split">
        <ul className="history-list">
          {history.length === 0 ? <p className="muted">No hay chats en este período.</p> : null}
          {history.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={openId === t.id ? 'inbox-card on' : 'inbox-card'}
                onClick={() => setOpenId(t.id)}
              >
                <p className="card-title">{t.userName}</p>
                {t.petName ? <p className="inbox-pet">Mascota · {t.petName}</p> : null}
                <p className="muted">{t.archived ? 'Archivado' : 'Activo'}</p>
                <time>{when(t.updatedAt)}</time>
              </button>
            </li>
          ))}
        </ul>
        <div className="history-read">
          {!current ? (
            <p className="muted">Elegí un chat de la lista para ver el dato.</p>
          ) : (
            <>
              <div className="chat-box-head">
                <p className="card-title">{current.userName}</p>
                {current.petName ? <p className="muted">Mascota · {current.petName}</p> : null}
                {current.archived ? (
                  <button type="button" className="primary" onClick={() => goPanel(current.id)}>
                    Reabrir en el panel
                  </button>
                ) : (
                  <button type="button" className="ghost" onClick={() => goPanel(current.id)}>
                    Abrir recuadro
                  </button>
                )}
              </div>
              <div className="thread">
                {current.messages.map((m) => (
                  <article key={m.id} className={m.from === 'shop' ? 'bubble shop' : 'bubble'}>
                    <p className="from">{m.from === 'shop' ? 'Local' : m.author}</p>
                    <p>{m.text}</p>
                    <time>{when(m.at)}</time>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
