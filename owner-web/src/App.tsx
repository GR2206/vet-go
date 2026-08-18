import { useEffect, useState, type ReactNode } from 'react';

import { CrispImg } from './ui/CrispImg';
import { OwnerProvider, useOwner } from './store';
import { Dashboard } from './Dashboard';
import { History } from './History';
import { HistorySales } from './HistorySales';
import { Login } from './Login';

export default function App() {
  return (
    <OwnerProvider>
      <Backdrop />
      <Gate />
    </OwnerProvider>
  );
}

function Backdrop() {
  return (
    <div className="app-back" aria-hidden>
      <CrispImg className="app-back-logo" src="/logo.png" alt="" logo decoding="sync" fetchPriority="low" />
    </div>
  );
}

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return hash;
}

function Gate() {
  const { shop, pin, authReady } = useOwner();
  const hash = useHash();
  let page: ReactNode;
  let tone = 'login';
  if (!authReady) {
    page = (
      <div className="login">
        <p className="muted" style={{ textAlign: 'center' }}>
          Cargando panel…
        </p>
      </div>
    );
  } else if (!shop) {
    page = <Login unknown={pin.length >= 4} />;
  } else if (hash.startsWith('#/historial-ventas')) {
    page = <HistorySales />;
    tone = 'app';
  } else if (hash.startsWith('#/historial')) {
    page = <History />;
    tone = 'app';
  } else {
    page = <Dashboard />;
    tone = 'app';
  }
  return <div className={`app-fore app-fore-${tone}`}>{page}</div>;
}
