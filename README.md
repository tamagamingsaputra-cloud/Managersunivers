# Sports Manager Simulator

Game manajemen olahraga berbasis web (sepak bola, voli, basket, motorsport). Versi **0.1 = Fondasi**:
dunia dengan geografi nyata dan klub fiktif, kalender, simulasi latar belakang di Web Worker,
jalur karier (manajer klub / pendiri perusahaan), keuangan sementara, dan save/load lokal (IndexedDB).

Arsitektur dan roadmap: lihat `docs/ARSITEKTUR.md`.

## Jalankan dari nol di Termux (Android)

```sh
pkg update && pkg upgrade
pkg install nodejs-lts git unzip
termux-setup-storage            # izinkan akses penyimpanan, sekali saja

cd ~
unzip ~/storage/downloads/sports-manager-sim.zip
cd sports-manager-sim

npm install
npm run dev -- -H 0.0.0.0       # buka http://localhost:3000 di browser HP
```

Perintah lain: `npm run typecheck`, `npm test`, `npm run build`.

Catatan Termux: `npm install` pertama kali bisa lama. Jika Next.js mengeluh soal SWC native,
jalankan `npm install @next/swc-wasm-nodejs` lalu ulangi. Jika build kehabisan memori, tutup aplikasi lain
atau jalankan `NODE_OPTIONS=--max-old-space-size=1536 npm run build`.

## Repo baru dan deploy

```sh
git init
git add .
git commit -m "Fondasi Sports Manager Simulator v0.1"
git branch -M main
git remote add origin <URL-repo-kosong-anda>
git push -u origin main
```

Netlify: Add new site -> Import from Git -> pilih repo. Build command `npm run build`
(sudah ada di `netlify.toml`); Netlify mendeteksi Next.js otomatis. Belum ada environment variable
yang wajib. Data game disimpan di browser pemain (IndexedDB), tidak di server.

## Struktur

```
src/engine/   simulasi murni TypeScript (tanpa React/DOM): core, time, world, economy, sim, match, worker
src/persistence/   IndexedDB (Dexie) + migrasi versi save
src/ui/       komponen React, store Zustand, penghubung ke worker
src/app/      halaman Next.js
tests/        unit + integrasi untuk engine
docs/         dokumen arsitektur
```
