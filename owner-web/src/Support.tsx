import { useState } from 'react';

import { CONTACT_EMAIL, CONTACT_WHATSAPP } from '@petsgo/lib/contact-info';

import { when } from './files';
import { useOwner } from './store';

const WA = `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent('Hola GR Producciones, escribo desde el panel PETS&GO.')}`;
const MAIL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Soporte PETS&GO Dueños')}`;

function MailLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" fill="#EA4335" />
      <path d="M3 6.2 12 13l9-6.8V7L12 14.2 3 7z" fill="#fff" />
    </svg>
  );
}

function WhatsLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#25D366"
        d="M12.04 2C6.5 2 2 6.4 2 11.86c0 1.74.46 3.44 1.34 4.94L2 22l5.36-1.4a10.1 10.1 0 0 0 4.68 1.14h.04c5.54 0 10.04-4.4 10.04-9.86C22.12 6.4 17.58 2 12.04 2z"
      />
      <path
        fill="#fff"
        d="M17.1 14.54c-.26-.13-1.54-.76-1.78-.84-.24-.1-.42-.13-.6.12-.18.24-.68.84-.84 1.02-.16.18-.3.2-.56.08-.26-.13-1.1-.4-2.1-1.28-.78-.7-1.3-1.56-1.46-1.82-.14-.26 0-.4.12-.52.12-.12.26-.3.4-.46.12-.14.18-.24.26-.4.08-.18.04-.32-.02-.46-.06-.12-.6-1.44-.82-1.98-.22-.52-.44-.44-.6-.44h-.5c-.18 0-.46.06-.7.32-.24.24-.92.9-.92 2.2s.94 2.56 1.08 2.74c.12.18 1.86 2.84 4.5 3.98 1.68.72 2.08.8 2.82.68.44-.08 1.54-.62 1.76-1.22.22-.6.22-1.12.16-1.22-.06-.1-.24-.16-.5-.3z"
      />
    </svg>
  );
}

export function Support() {
  const { shop, supportChat, sendSupport } = useOwner();
  const [text, setText] = useState('');
  if (!shop) return null;

  return (
    <section>
      <h1>Soporte GR Producciones</h1>
      <div className="support-ways">
        <a className="support-chip" href={MAIL}>
          <MailLogo />
          <span>
            <strong>Mail</strong>
            <small>{CONTACT_EMAIL}</small>
          </span>
        </a>
        <a className="support-chip" href={WA} target="_blank" rel="noreferrer">
          <WhatsLogo />
          <span>
            <strong>WhatsApp</strong>
            <small>GR Producciones</small>
          </span>
        </a>
      </div>
      <h2 className="subhead">Chat en vivo</h2>
      <p className="muted">Queda en el panel. Cuando esté la nube, lo ves en tu usuario admin.</p>
      <article className="chat-box support-live">
        <header className="chat-box-head">
          <p className="card-title">GR Producciones · admin</p>
        </header>
        <div className="msgs">
          {supportChat.map((m) => (
            <article key={m.id} className={m.from === 'shop' ? 'bubble shop' : 'bubble'}>
              <p className="from">{m.from === 'shop' ? 'GR Producciones' : shop.name}</p>
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
            placeholder="Escribile al admin…"
          />
          <button
            type="button"
            className="primary"
            onClick={() => {
              sendSupport(text);
              setText('');
            }}
          >
            Enviar
          </button>
        </div>
      </article>
    </section>
  );
}
