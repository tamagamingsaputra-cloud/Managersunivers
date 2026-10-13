# Arsitektur — Sports Manager Simulator

Status: tahap 1 (fondasi) selesai. Dokumen ini menjadi acuan tahap berikutnya.

## Prinsip
- Simulasi, rendering, UI, AI, dan penyimpanan dipisah. `src/engine` tidak mengimpor React, DOM, atau Dexie.
- Simulasi deterministik: seed yang sama + keputusan yang sama = hasil yang sama (PRNG `mulberry32`, state disimpan di save).
- Semua perubahan state terjadi lewat kejadian terjadwal (`EventQueue`) yang ditangani handler modul.
- Tidak ada skor acak: mesin pertandingan harus menghasilkan hasil dari rangkaian kejadian (kontrak: `engine/match/types.ts`).
- Geografi nyata; klub, atlet, liga, perusahaan fiktif.

## Teknologi dan alasan
| Pilihan | Alasan | Ditolak |
|---|---|---|
| Next.js (App Router) + TypeScript ketat + Tailwind | sudah dikuasai alurnya di Termux, deploy Netlify mudah | framework lain: tidak ada alasan kuat |
| Web Worker untuk simulasi | UI tetap responsif saat waktu dipercepat | simulasi di thread UI |
| IndexedDB via Dexie | save besar, transaksi, versi skema | localStorage (batas ~5 MB, sinkron) |
| Zustand | state UI kecil, tanpa boilerplate | Redux (berlebihan) |
| Peta: d3-geo + Natural Earth yang dibundel (tahap 6) | legal, offline, tanpa batas tile | Google Maps (biaya/ToS), tile publik OSM (kebijakan pemakaian) |
| three.js, lazy-load (tahap 9) | stylized 3D hanya untuk stadion/arena | Unity/Godot (tidak cocok alur Termux+web) |

## Modul dan kontrak
- `core`: `Rng`, `IdGenerator` (ID berprefiks `org_`, `ath_`, `cit_`, ...).
- `time`: `calendar` (hari = integer sejak 1970-01-01 UTC), `EventQueue` (terurut per hari, FIFO).
- `world`: tipe entitas, seed geografi, `buildWorld`.
- `economy`: handler kejadian ekonomi (saat ini model sementara `monthly_close`).
- `sim`: `GameState`, `Simulation` (satu-satunya yang menjalankan hari), `validate`, `newGame`, `view`.
- `match`: kontrak `MatchEngine` (belum ada implementasi).
- `worker`: `sim.worker.ts` + `protocol.ts` (pesan `new/load/setSpeed/advance/snapshot` -> `view/snapshot/error`).
- `persistence`: `db.ts` (Dexie: `saveMeta` + `saveData`), `migrate.ts`.

Modul baru mendaftarkan handler lewat `Simulation.register(type, handler)` dan menjadwalkan kejadian lewat `ctx.queue`.
UI tidak pernah mengubah state; UI hanya mengirim pesan ke worker.

## Skema data (v1)
`GameState`: `schemaVersion, seed, careerPath, playerOrgId, day, rngState, idCounters, queue, world, log`.
`world`: `countries, cities, organizations, athletes` (Record berkunci ID). Relasi hanya lewat ID;
`validateState` memeriksa kecocokan kunci-ID, referensi, rentang nilai, tepat satu organisasi pemain, dan urutan antrean.
Save dimuat lewat `migrateState` (versi lebih baru ditolak, rusak ditolak). Naikkan `SCHEMA_VERSION` saat bentuk berubah.

## Waktu dan simulasi latar
Satu langkah = satu hari. Kecepatan = hari per detik (1/2/4/8), dijalankan oleh worker. Seluruh dunia disimulasikan
lewat antrean kejadian yang sama, sehingga tidak ada "dunia yang membeku" saat tidak dilihat.
Rencana tahap 4+: kompetisi yang diikuti pemain disimulasikan penuh; kompetisi lain memakai mesin yang sama
dengan fidelitas lebih rendah (batas ini akan ditampilkan secara transparan di UI).

## Pengujian
- Sekarang: unit + integrasi engine (`tests/`): determinisme, save/load setia, validasi, migrasi, jalur karier.
- Berikutnya: simulasi massal per cabor (distribusi skor wajar), snapshot ber-seed untuk regresi, Playwright viewport HP.

## Risiko dan batasan
- `next build` berat di Termux; gunakan mode dev dan build bertahap.
- Dunia global (ribuan atlet) membebani memori HP: data ringkas, `view` kecil ke UI, pemuatan bertahap.
- Aset 3D: batas ukuran per aset, lazy-load. Peta: data dibundel, fallback tanpa tile.
- Empat mesin cabor adalah beban terbesar; motorsport paling berbeda.
- Model ekonomi saat ini sementara dan sengaja sederhana.

## Roadmap
1. **Fondasi (selesai)**: TypeScript, modul, ID, skema, worker, save/load, jalur karier, dashboard minimal.
2. Dunia, kalender, organisasi (struktur divisi untuk perusahaan, hubungan induk-klub).
3. Atlet, kontrak, ekonomi sungguhan.
4. Mesin sepak bola, kompetisi, klasemen.
5. Design system penuh, dashboard, navigasi (Prompt 02, 03).
6. Peta interaktif (Prompt 04).
7. Basket, voli, motorsport.
8. AI organisasi, delegasi, jalur pendiri penuh.
9. 3D, optimasi, pengujian massal.

## Keputusan terbuka (perlu persetujuan sebelum tahap 2)
- Mata uang game: saat ini satu unit tak bernama.
- Ukuran dunia v1.0 (jumlah negara/liga/atlet) dan batas fidelitas simulasi latar.
- Aturan kewenangan manajer klub vs pemilik (Prompt 03 menyebut "kewenangannya").
