import { useMemo, useState } from 'react';

import { startOfDay } from '@petsgo/lib/dates';

import { useOwner, type AppointmentService, type OwnerAppointment } from './store';

type View = 'month' | 'week' | 'day';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const SERVICE: Record<AppointmentService, { label: string; emoji: string }> = {
  vet: { label: 'Veterinaria', emoji: '👨‍⚕️' },
  vaccine: { label: 'Vacunación', emoji: '💉' },
  bath: { label: 'Baño', emoji: '🚿' },
  cut: { label: 'Corte', emoji: '✂️' },
};

function petEmoji(species: OwnerAppointment['species']) {
  return species === 'cat' ? '🐱' : '🐶';
}

function marks(ap: OwnerAppointment) {
  return `${petEmoji(ap.species)} ${SERVICE[ap.serviceKind].emoji}`;
}

function monday0(d: Date) {
  return (d.getDay() + 6) % 7;
}

function atMidnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const next = atMidnight(d);
  next.setDate(next.getDate() + n);
  return next;
}

function monthCells(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = addDays(first, -monday0(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function weekDays(cursor: Date) {
  const start = addDays(cursor, -monday0(cursor));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function sameDay(a: number | Date, b: number | Date) {
  return startOfDay(typeof a === 'number' ? a : a.getTime()) === startOfDay(typeof b === 'number' ? b : b.getTime());
}

function titleMonth(d: Date) {
  const raw = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function titleWeek(d: Date) {
  const days = weekDays(d);
  const a = days[0];
  const b = days[6];
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${a.toLocaleDateString('es-AR', opts)} – ${b.toLocaleDateString('es-AR', opts)}`;
}

function titleDay(d: Date) {
  const raw = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function Chip({ ap }: { ap: OwnerAppointment }) {
  const svc = SERVICE[ap.serviceKind];
  return (
    <span className={`cal-chip ${ap.serviceKind}${ap.taken ? ' taken' : ''}`}>
      <span className="cal-emo" aria-hidden="true">
        {marks(ap)}
      </span>
      <b>{ap.petName}</b>
      <em>{svc.label}</em>
    </span>
  );
}

function DayCell({
  day,
  cursor,
  items,
  compact,
  onOpen,
}: {
  day: Date;
  cursor: Date;
  items: OwnerAppointment[];
  compact?: boolean;
  onOpen: (d: Date) => void;
}) {
  const today = sameDay(day, Date.now());
  const out = day.getMonth() !== cursor.getMonth();
  const max = compact ? 3 : 8;
  const extra = items.length - max;
  return (
    <button
      type="button"
      className={`cal-cell${today ? ' today' : ''}${out ? ' out' : ''}`}
      onClick={() => onOpen(day)}
    >
      <span className="cal-num">{day.getDate()}</span>
      <span className="cal-chips">
        {items.slice(0, max).map((ap) => (
          <Chip key={ap.id} ap={ap} />
        ))}
        {extra > 0 ? <span className="cal-more">+{extra}</span> : null}
      </span>
    </button>
  );
}

export function TurnosCal() {
  const { appointments, toggleTaken, turnos, prices, setPrice } = useOwner();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => atMidnight(new Date()));
  const [openId, setOpenId] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<number, OwnerAppointment[]>();
    for (const ap of appointments) {
      const key = startOfDay(ap.at);
      const list = map.get(key) ?? [];
      list.push(ap);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.at - b.at);
    return map;
  }, [appointments]);

  const itemsFor = (d: Date) => byDay.get(startOfDay(d.getTime())) ?? [];

  const shift = (dir: number) => {
    setCursor((prev) => {
      if (view === 'month') return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      if (view === 'week') return addDays(prev, dir * 7);
      return addDays(prev, dir);
    });
  };

  const openDay = (d: Date) => {
    setCursor(atMidnight(d));
    setView('day');
    setOpenId(null);
  };

  const dayList = itemsFor(cursor);
  const heading = view === 'month' ? titleMonth(cursor) : view === 'week' ? titleWeek(cursor) : titleDay(cursor);

  return (
    <section className="cal-page">
      <div className="cal-top">
        <div>
          <h1>📅 Turnos</h1>
        </div>
        <div className="cal-views">
          <button type="button" className={view === 'month' ? 'seg month on' : 'seg month'} onClick={() => setView('month')}>
            🗓️ Ver por mes
          </button>
          <button type="button" className={view === 'week' ? 'seg week on' : 'seg week'} onClick={() => setView('week')}>
            📅 Ver por semana
          </button>
          <button type="button" className={view === 'day' ? 'seg day on' : 'seg day'} onClick={() => setView('day')}>
            📍 Ver por día
          </button>
        </div>
      </div>

      {turnos.length ? (
        <ul className="cal-prices">
          {turnos.map((s) => (
            <li key={s.id}>
              <span>{s.name}</span>
              <label>
                $
                <input
                  inputMode="numeric"
                  defaultValue={String(prices[s.id] ?? s.price)}
                  onBlur={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, ''));
                    if (n > 0) setPrice(s.id, n);
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="cal-nav">
        <button type="button" className="ghost" onClick={() => shift(-1)}>
          ←
        </button>
        <h2 className="cal-heading">{heading}</h2>
        <button type="button" className="ghost" onClick={() => shift(1)}>
          →
        </button>
        <button type="button" className="ghost" onClick={() => setCursor(atMidnight(new Date()))}>
          ☀️ Hoy
        </button>
        <p className="cal-legend">
          <span className="cal-chip vet">
            <span className="cal-emo">👨‍⚕️</span> Veterinaria
          </span>
          <span className="cal-chip vaccine">
            <span className="cal-emo">💉</span> Vacunación
          </span>
          <span className="cal-chip bath">
            <span className="cal-emo">🚿</span> Baño
          </span>
          <span className="cal-chip cut">
            <span className="cal-emo">✂️</span> Corte
          </span>
        </p>
      </div>

      {view === 'month' ? (
        <div className="cal-month">
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal-board">
            {monthCells(cursor).map((day) => (
              <DayCell
                key={day.toISOString()}
                day={day}
                cursor={cursor}
                items={itemsFor(day)}
                compact
                onOpen={openDay}
              />
            ))}
          </div>
        </div>
      ) : null}

      {view === 'week' ? (
        <div className="cal-week-wrap">
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal-week">
            {weekDays(cursor).map((day) => (
              <DayCell key={day.toISOString()} day={day} cursor={cursor} items={itemsFor(day)} onOpen={openDay} />
            ))}
          </div>
        </div>
      ) : null}

      {view === 'day' ? (
        <div className="agenda">
          {dayList.length === 0 ? (
            <p className="muted">🐾 No hay turnos este día.</p>
          ) : (
            dayList.map((ap) => {
              const open = openId === ap.id;
              return (
                <article key={ap.id} className={`agenda-row ${ap.serviceKind}${ap.taken ? ' taken' : ''}${open ? ' open' : ''}`}>
                  <time className="agenda-time">{ap.time}</time>
                  <button
                    type="button"
                    className="agenda-body"
                    onClick={() => setOpenId(open ? null : ap.id)}
                  >
                    <p className="agenda-pet">
                      <span className="cal-emo">{marks(ap)}</span> {ap.petName}
                    </p>
                    <p className="agenda-meta">
                      {SERVICE[ap.serviceKind].label} · {ap.serviceName}
                    </p>
                  </button>
                  <label className="taken-box" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={ap.taken} onChange={() => toggleTaken(ap.id)} />
                    Ya tomó el turno
                  </label>
                  {open ? (
                    <div className="tutor-drop">
                      <div>
                        <p className="card-title">{ap.tutorName}</p>
                        <p className="muted">Tutor de {ap.petName}</p>
                        <p>
                          <a href={`tel:${ap.tutorPhone}`}>{ap.tutorPhone}</a>
                        </p>
                        <p>
                          <a href={`mailto:${ap.tutorEmail}`}>{ap.tutorEmail}</a>
                        </p>
                      </div>
                      <button type="button" className="fold" aria-label="Cerrar datos del tutor" onClick={() => setOpenId(null)}>
                        ▲
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
}
