import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const data = fileURLToPath(new URL('../data', import.meta.url));
const lib = fileURLToPath(new URL('../lib', import.meta.url));
const liveFile = fileURLToPath(new URL('../data/live-catalog.json', import.meta.url));

type LiveFile = {
  shops: Record<
    string,
    {
      products: unknown[];
      paused: Record<string, boolean>;
      asks: { id: string; shopId: string; productId: string; productName: string; tutorName: string; at: number }[];
      updatedAt: number;
    }
  >;
};

function readLive(): LiveFile {
  try {
    return JSON.parse(fs.readFileSync(liveFile, 'utf8')) as LiveFile;
  } catch {
    return { shops: {} };
  }
}

function writeLive(db: LiveFile) {
  fs.writeFileSync(liveFile, JSON.stringify(db, null, 2));
}

function shopOf(db: LiveFile, shopId: string) {
  db.shops[shopId] ??= { products: [], paused: {}, asks: [], updatedAt: Date.now() };
  return db.shops[shopId];
}

function liveCatalogPlugin(): Plugin {
  return {
    name: 'live-catalog',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (url !== '/api/live-catalog') return next();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        const send = (obj: unknown) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };
        if (req.method === 'GET') {
          send(readLive());
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c as Buffer));
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown>;
            const db = readLive();
            const shopId = String(body.shopId ?? '');
            if (body.action === 'publish' && shopId) {
              const row = shopOf(db, shopId);
              row.products = Array.isArray(body.products) ? body.products : row.products;
              row.paused = (body.paused as Record<string, boolean>) ?? row.paused;
              row.updatedAt = Date.now();
            } else if (body.action === 'ask' && shopId) {
              const row = shopOf(db, shopId);
              const productId = String(body.productId ?? '');
              const dup = row.asks.some(
                (a) => a.productId === productId && Date.now() - a.at < 1000 * 60 * 30,
              );
              if (!dup) {
                row.asks.unshift({
                  id: String(body.id ?? `ask-${Date.now()}`),
                  shopId,
                  productId,
                  productName: String(body.productName ?? 'Producto'),
                  tutorName: String(body.tutorName ?? 'Un tutor'),
                  at: Number(body.at ?? Date.now()),
                });
              }
              row.updatedAt = Date.now();
            } else if (body.action === 'dismiss' && shopId) {
              const row = shopOf(db, shopId);
              row.asks = row.asks.filter((a) => a.id !== body.id);
              row.updatedAt = Date.now();
            } else if (body.action === 'deduct' && shopId) {
              const row = shopOf(db, shopId);
              const items = Array.isArray(body.items) ? (body.items as { productId: string; qty: number }[]) : [];
              row.products = row.products.map((p) => {
                const prod = p as { id: string; stock: number };
                const hit = items.find((i) => i.productId === prod.id);
                if (!hit) return p;
                return { ...prod, stock: Math.max(0, (prod.stock ?? 0) - Math.max(0, hit.qty)) };
              });
              row.updatedAt = Date.now();
            }
            writeLive(db);
            send(db);
          } catch {
            res.statusCode = 400;
            res.end('{"error":"bad json"}');
          }
        });
      });
    },
  };
}

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const FIREBASE_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, ['EXPO_PUBLIC_', 'VITE_']);
  const firebaseDefine = Object.fromEntries(
    FIREBASE_KEYS.map((key) => [
      `process.env.EXPO_PUBLIC_${key}`,
      JSON.stringify(env[`EXPO_PUBLIC_${key}`] || env[`VITE_${key}`] || ''),
    ]),
  );

  return {
    envDir: repoRoot,
    envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
    define: firebaseDefine,
    plugins: [react(), liveCatalogPlugin()],
    resolve: {
      alias: {
        '@petsgo/data': data,
        '@petsgo/lib': lib,
      },
    },
    server: {
      port: 5173,
      open: true,
      host: true,
    },
  };
});
