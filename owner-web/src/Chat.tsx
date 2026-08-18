import { useLayoutEffect, useRef, useState } from 'react';

import type { ShopThread } from '@petsgo/data/types';

import { when } from './files';
import { useOwner } from './store';

const CLOSE_MS = 320;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clientName(thread: ShopThread) {
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    const m = thread.messages[i];
    if (m.from === 'user' && m.author?.trim()) return m.author.trim();
  }
  const name = thread.userName?.trim();
  if (name && !/petshop|veterinaria|local/i.test(name)) return name;
  return 'Tutor';
}

function petInfo(thread: ShopThread) {
  const raw = thread.petName?.trim();
  const name = raw?.replace(/\s*[·•|\-]\s*(gato|perro|cat|dog)\s*$/i, '').trim();
  if (!name) return null;
  const cat =
    thread.petSpecies === 'cat' || /\b(gato|cat)\b/i.test(`${thread.petSpecies ?? ''} ${raw}`);
  return { name, cat };
}

function PetChip({ pet }: { pet: { name: string; cat: boolean } }) {
  return (
    <p className="inbox-pet">
      <span className="inbox-pet-logo" aria-hidden="true">
        {pet.cat ? '🐱' : '🐶'}
      </span>
      <span>{pet.name}</span>
    </p>
  );
}

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
  const [closingIds, setClosingIds] = useState<string[]>([]);
  const closeTimers = useRef<Record<string, number>>({});
  const open = openThreadIds
    .map((id) => threads.find((t) => t.id === id))
    .filter((t): t is ShopThread => Boolean(t));

  const finishClose = (id: string) => {
    const timer = closeTimers.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete closeTimers.current[id];
    }
    closeThread(id);
    setClosingIds((prev) => prev.filter((x) => x !== id));
  };

  const requestClose = (id: string) => {
    if (prefersReducedMotion()) {
      finishClose(id);
      return;
    }
    setClosingIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    if (!closeTimers.current[id]) {
      closeTimers.current[id] = window.setTimeout(() => finishClose(id), CLOSE_MS);
    }
  };

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
            const last = t.messages?.[t.messages.length - 1];
            const on = openThreadIds.includes(t.id);
            const unread = unreadThreadIds.includes(t.id);
            const name = clientName(t);
            const pet = petInfo(t);
            return (
              <button
                key={t.id}
                type="button"
                className={`inbox-card${on ? ' on' : ''}${unread && !on ? ' unread' : ''}`}
                onClick={() => (on ? requestClose(t.id) : openThread(t.id))}
              >
                <p className="card-title">{name}</p>
                {pet ? <PetChip pet={pet} /> : null}
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
            open.map((t) => (
              <ChatBox
                key={t.id}
                thread={t}
                pet={petInfo(t)}
                closing={closingIds.includes(t.id)}
                onRequestClose={() => requestClose(t.id)}
                onClosed={() => finishClose(t.id)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ChatBox({
  thread,
  pet,
  closing,
  onRequestClose,
  onClosed,
}: {
  thread: ShopThread;
  pet: { name: string; cat: boolean } | null;
  closing: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
}) {
  const { sendThreadReply, deleteThread } = useOwner();
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [settled, setSettled] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const name = clientName(thread);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || closing) return;
    el.scrollTop = el.scrollHeight;
  }, [thread.id, thread.messages.length, thread.updatedAt, expanded, closing]);

  return (
    <article
      className={`chat-box${expanded ? ' expanded' : ''}${settled ? ' settled' : ''}${closing ? ' closing' : ''}`}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        const anim = e.animationName;
        if (closing && anim.includes('chat-balloon-out')) onClosed();
        if (!closing && anim.includes('chat-balloon-in')) setSettled(true);
      }}
    >
      <header className="chat-box-head">
        <div>
          <p className="card-title">{name}</p>
          {pet ? <PetChip pet={pet} /> : null}
        </div>
        <div className="chat-box-actions">
          <button type="button" className="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Achicar' : 'Ampliar'}
          </button>
          <button type="button" className="ghost" onClick={onRequestClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              deleteThread(thread.id);
              onClosed();
            }}
          >
            Borrar
          </button>
        </div>
      </header>
      <div className="msgs" ref={scroller}>
        {thread.messages?.map((m) => (
          <article key={m.id} className={m.from === 'shop' ? 'bubble shop' : 'bubble'}>
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
          placeholder={`Responder a ${name}…`}
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
