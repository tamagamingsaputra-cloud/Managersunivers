# Sports Manager Simulator v1.0

Simulasi manajemen olahraga berbasis web: voli, basket, sepak bola, motorsport.
Arsitektur lengkap: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Memulai

```bash
npm install
npm install react react-dom @babylonjs/core @babylonjs/loaders maplibre-gl zustand react-router-dom dexie zod comlink
npm install -D typescript vite @vitejs/plugin-react vitest fast-check @playwright/test @types/react @types/react-dom
npm run verify   # typecheck + batas modul + tes
npm run dev
```

`package.json` sengaja belum mencantumkan versi dependensi: perintah `npm install` di atas akan
mengunci versi terbaru yang kompatibel ke `package.json` dan `package-lock.json` di mesin Anda.
Paket yang baru dipakai di fase berikutnya (Babylon.js, MapLibre, Dexie, Zod, Comlink, Zustand,
React Router, Playwright) boleh dipasang belakangan.

## Status

| Fase | Status |
|------|--------|
| 0 Perkakas | Selesai: TypeScript strict, Vite, Vitest, penegak batas modul |
| 1 Kernel | Sebagian: ID, RNG, kalender, scheduler, jam, event bus. Belum: worker + RPC, adapter IndexedDB, pengukuran anggaran |
| 2+ | Belum dimulai |

## Aturan penting `src/sim-core`

- Tanpa DOM, React, Babylon, atau API browser (dicek oleh `tsconfig.core.json` dan `npm run check:boundaries`).
- Tanpa `Math.random`, `Date.now`, `new Date`, timer, atau I/O. Gunakan `Rng`, kalender, dan `runUntil`.
- Impor antar-modul hanya lewat `index.ts` modul tujuan.
- Nilai golden RNG di `tests/unit/rng.test.ts` menjaga kompatibilitas simpanan: jangan ubah algoritma tanpa migrasi.
