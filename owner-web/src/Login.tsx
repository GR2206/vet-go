import { CrispImg } from './ui/CrispImg';
import { useOwner } from './store';

export function Login({ unknown }: { unknown: boolean }) {
  const { pin, setPin } = useOwner();

  return (
    <div className="login">
      <div className="login-panel">
        <div className="login-card">
          <CrispImg className="login-logo" src="/logo.png" alt="PETS&GO" logo decoding="sync" fetchPriority="high" />
          <h1>🐾 Panel de dueños</h1>
          <p className="lead">
            El local carga precios, stock y ofertas. El tutor las ve el mismo día en la app.
          </p>
          <label htmlFor="pin">🔑 PIN del local</label>
          <input
            id="pin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
          />
          {unknown ? <p className="err">Ese PIN no está asociado a un local.</p> : null}
          {import.meta.env.DEV ? (
            <p className="hint">
              Demo dev: Pichichos <b>4411</b> · San Martín <b>2580</b> · Luna <b>1919</b>
            </p>
          ) : (
            <p className="hint">Si no tenés PIN, pedilo a PETS&GO / GR admin.</p>
          )}
        </div>
      </div>
    </div>
  );
}
