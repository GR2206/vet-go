import { cities, zones } from '@petsgo/data/mock';
import type { PaymentMethod, ShippingKind } from '@petsgo/data/types';
import { paymentLabel, shippingLabel } from '@petsgo/lib/format';

import { pickImage } from './files';
import { CrispImg } from './ui/CrispImg';
import { PAYMENT_OPTIONS, SHIPPING_OPTIONS, useOwner } from './store';

export function Local() {
  const { shop, coverUri, avatarUri, setCover, setAvatar, updateShop } = useOwner();
  if (!shop) return null;

  const addPay = (method: PaymentMethod) => {
    if (shop.paymentMethods.includes(method)) return;
    updateShop({ paymentMethods: [...shop.paymentMethods, method] });
  };

  return (
    <section>
      <h1>🏪 Ficha del local</h1>
      <button type="button" className="cover-btn" onClick={() => pickImage(setCover)}>
        <CrispImg src={coverUri} alt="" photo />
        <span>📷 Cambiar portada</span>
      </button>
      <div className="avatar-row">
        <button type="button" className="avatar-btn" onClick={() => pickImage(setAvatar)}>
          <CrispImg src={avatarUri} alt="" photo />
        </button>
        <div>
          <p className="card-title">{shop.name}</p>
          <button type="button" className="link" onClick={() => pickImage(setAvatar)}>
            Cambiar foto de perfil 📷
          </button>
        </div>
      </div>

      <div className="fields local-fields">
        <label>
          Nombre
          <input value={shop.name} onChange={(e) => updateShop({ name: e.target.value })} />
        </label>
        <label>
          Teléfono
          <input value={shop.phone} onChange={(e) => updateShop({ phone: e.target.value })} />
        </label>
        <label>
          Dirección
          <input value={shop.address} onChange={(e) => updateShop({ address: e.target.value })} />
        </label>
        <label>
          Horario
          <input value={shop.hours} onChange={(e) => updateShop({ hours: e.target.value })} />
        </label>
        <label>
          Ciudad
          <select
            value={shop.city ?? 'Rosario'}
            onChange={(e) => updateShop({ city: e.target.value })}
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Barrio
          <select
            value={shop.neighborhood}
            onChange={(e) => updateShop({ neighborhood: e.target.value })}
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
            {zones.includes(shop.neighborhood) ? null : (
              <option value={shop.neighborhood}>{shop.neighborhood}</option>
            )}
          </select>
        </label>
        <label>
          Tipo de envíos
          <select
            value={shop.shippingKind ?? (shop.delivery ? 'same_day' : 'pickup')}
            onChange={(e) => updateShop({ shippingKind: e.target.value as ShippingKind })}
          >
            {SHIPPING_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {shippingLabel(k)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Agregar forma de pago
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addPay(e.target.value as PaymentMethod);
            }}
          >
            <option value="">Elegí un medio…</option>
            {PAYMENT_OPTIONS.filter((m) => !shop.paymentMethods.includes(m)).map((m) => (
              <option key={m} value={m}>
                {paymentLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <div className="span-2">
          <p className="field-label">💳 Formas de pago activas</p>
          <div className="chips">
            {shop.paymentMethods.map((m) => (
              <button
                key={m}
                type="button"
                className="chip"
                onClick={() =>
                  updateShop({ paymentMethods: shop.paymentMethods.filter((x) => x !== m) })
                }
              >
                {paymentLabel(m)} ×
              </button>
            ))}
          </div>
        </div>
        <label className="span-2">
          Descripción
          <textarea
            rows={4}
            value={shop.blurb}
            onChange={(e) => updateShop({ blurb: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}
