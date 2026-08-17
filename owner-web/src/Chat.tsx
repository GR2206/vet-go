import { useState } from 'react';

import type { ShopThread } from '@petsgo/data/types';

import { when } from './files';
import { useOwner } from './store';

export function Chat() {
  const {
    inbox,
    openThreadIds,
    openThread,
    closeThread,
    threads,
    unreadThreadIds,
    chatAutoExpire,
    setChatAutoExpire,
  } = useOwner();
  const open = openThreadIds
    .map((id) => threads.find((t) => t.id === id))
    .filter((t): t is ShopThread => Boolean(t));

  return (
    <section className="chat-page">
      <div className="chat-head">
        <div>
          <h1>Chat con tutores</h1>
        </div>
        <div className="chat-tools">
          <button
            type="button"
            className={chatAutoExpire ? 'ghost' : 'primary'}
            onClick={() => setChatAutoExpire(!chatAutoExpire)}
          >
            {chatAutoExpire ? 'Caducidad 30 días: on' : 'Caducidad anulada'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() =>
              window.open(`${window.location.pathname}#/historial`, '_blank', 'noopener')
            }
          >
            Historial 30 días
          </button>
        </div>
      </div>
      <p className="muted">
        {chatAutoExpire
          ? 'Los chats se borran solos a los 30 días, del más viejo al más nuevo. Anulá la caducidad si querés guardarlos.'
          : 'La caducidad está anulada: el historial no se borra solo.'}
      </p>
      <div className="chat-split">
        <aside className="inbox">
          {inbox.length === 0 ? <p className="muted">No hay chats activos.</p> : null}
          {inbox.map((t) => {
            const last = t.messages[t.messages.length - 1];
            const on = openThreadIds.includes(t.id);
            const unread = unreadThreadIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`inbox-card${on ? ' on' : ''}${unread ? ' unread' : ''}`}
                onClick={() => (on ? closeThread(t.id) : openThread(t.id))}
              >
                <p className="card-title">{t.userName}</p>
                <p className="muted">{last?.text ?? 'Sin mensajes'}</p>
                <time>{when(t.updatedAt)}</time>
              </button>
            );
          })}
        </aside>
        <div className="chat-desk">
          {open.length === 0 ? (
            <p className="muted">Abrí un recuadro desde la bandeja para responder.</p>
          ) : (
            open.map((t) => <ChatBox key={t.id} thread={t} />)
          )}
        </div>
      </div>
    </section>
  );
}

function ChatBox({ thread }: { thread: ShopThread }) {
  const { sendThreadReply, deleteThread, closeThread } = useOwner();
  const [text, setText] = useState('');

  return (
    <article className="chat-box">
      <header className="chat-box-head">
        <div>
          <p className="card-title">{thread.userName}</p>
          <p className="muted">{thread.messages.length} mensajes</p>
        </div>
        <div className="chat-box-actions">
          <button type="button" className="ghost" onClick={() => closeThread(thread.id)}>
            Cerrar
          </button>
          <button type="button" className="danger" onClick={() => deleteThread(thread.id)}>
            Borrar chat
          </button>
        </div>
      </header>
      <div className="msgs">
        {thread.messages.map((m) => (
          <article key={m.id} className={m.from === 'shop' ? 'bubble shop' : 'bubble'}>
            <p className="from">{m.from === 'shop' ? 'Local' : m.author}</p>
            <p>{m.text}</p>
            <time>{when(m.at)}</time>
          </article>
        ))}
      </div>
      <div className="chat-compose">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Responder a ${thread.userName}…`}
        />
        <button
          type="button"
          className="primary"
          onClick={() => {
            sendThreadReply(thread.id, text);
            setText('');
          }}
        >
          Enviar
        </button>
      </div>
    </article>
  );
}
