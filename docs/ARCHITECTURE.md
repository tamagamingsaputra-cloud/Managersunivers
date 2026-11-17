# Sports Manager Simulator v1.0 — Dokumen Arsitektur (Tahap 01)

Status: **Revisi 2.** Keputusan olahraga (voli, basket, sepak bola, motorsport) dan mesin 3D (Babylon.js) sudah masuk. Fondasi sudah dikerjakan (Fase 0 dan kernel Fase 1, lihat §15). Belum ada kode fitur game.
Konteks: proyek baru dari nol, jadi tidak ada kode lama yang harus dipertahankan dan tidak ada framework yang "diganti". Semua pilihan di bawah adalah keputusan awal yang bisa Anda tolak atau ubah.

## 0. Hal yang belum diketahui (jawaban Anda mengubah dokumen ini)

| # | Pertanyaan | Dampak |
|---|-----------|--------|
| 1 | ~~Empat cabang olahraga~~ **TERJAWAB:** voli, basket, sepak bola, motorsport | Lihat §5.4. Motorsport berbeda struktur dari tiga olahraga tim, jadi model data digeneralisasi. **Masih terbuka:** jenis motorsport (default sementara: balap roda terbuka bergaya Formula, fiktif). |
| 2 | Isi Master Prompt (belum saya terima) | Bisa menambah atau mengubah batasan di sini. |
| 3 | Satu pemain atau multiplayer? | Dokumen ini mengasumsikan **satu pemain, offline-first, tanpa server**. |
| 4 | Target perangkat minimum HP | Dipakai untuk anggaran memori dan aset (§9). Asumsi sementara: HP Android kelas menengah 4 GB RAM, iPhone 2 generasi terakhir. |

## 1. Ringkasan keputusan

| Area | Pilihan | Alasan singkat |
|------|---------|----------------|
| Bahasa | TypeScript (strict) | Model data besar dan relasi antarmodul butuh pengecekan tipe. |
| Build | Vite | Cepat, bundling per-chunk untuk memuat 3D dan peta secara malas. |
| UI | React 18 + React Router | Ekosistem terbesar, cocok untuk komponen reusable dan design system. |
| State UI | Zustand (hanya state tampilan) | Ringan. State dunia **bukan** di sini. |
| Inti simulasi | TypeScript murni tanpa DOM, berjalan di **Web Worker** | UI tidak membeku saat simulasi cepat; inti bisa diuji di Node. |
| Komunikasi | Comlink (RPC) + event stream ke UI | Kontrak jelas, tanpa SharedArrayBuffer. |
| Penyimpanan | IndexedDB via Dexie | Data besar, terstruktur, asinkron. |
| Validasi | Zod di batas sistem (load, import, data seed) | Menolak data rusak sebelum masuk simulasi. |
| Peta | MapLibre GL JS | Open source, WebGL, vektor, tidak butuh kunci API. |
| 3D | Babylon.js (`@babylonjs/core` + `@babylonjs/loaders`, impor modular), dibungkus komponen React imperatif, dimuat malas | Pilihan Anda. Engine lengkap (material, glTF, kamera, Inspector untuk dev); chunk hanya diunduh di layar 3D. |
| Styling | CSS variables (design token) + Tailwind untuk utilitas | Token satu sumber untuk tema dan status. |
| Tes | Vitest, fast-check, Playwright | Unit, properti, integrasi UI, viewport HP. |

## 2. Prinsip arsitektur

1. **Simulasi terpisah dari tampilan.** Inti (`sim-core`) tidak mengimpor React, DOM, atau Babylon. UI hanya membaca *snapshot/selector* dan mengirim *perintah*.
2. **Deterministik.** Seed dunia yang sama + urutan perintah yang sama = hasil yang sama. Syarat tes regresi dan reproduksibilitas dunia.
3. **Data dulu, tampilan belakangan.** Setiap layar harus terhubung ke data nyata atau menampilkan status "belum tersedia" yang jujur.
4. **Level of detail (LOD) simulasi.** Detail penuh hanya untuk yang relevan bagi pemain; sisanya disimulasikan statistik.
5. **Aman terhadap batas browser.** Tidak mengandalkan server, filesystem, atau kuota tak terbatas.
6. **Bertahap.** Tiap fase punya kriteria selesai yang dapat diuji.

## 3. Struktur repositori (monorepo ringan, satu paket)

```
/src
  /sim-core            # TANPA dependensi DOM/React
    /kernel            # id, rng, clock, event-bus, command-bus, result types
    /world             # negara, kota, wilayah, zona waktu, fasilitas
    /time              # kalender, scheduler, kecepatan, fast-forward
    /organization      # organisasi, divisi, kewenangan, target, pemilik
    /people            # atlet, staf, kontrak, atribut, perkembangan, cedera
    /competition       # format, jadwal, klasemen, promosi/degradasi
    /sport-rules       # plugin per cabang: volleyball, basketball, football, motorsport
    /match             # mesin pertandingan (per sport-rules)
    /economy           # kas, gaji, sponsor, tiket, utang, proyeksi
    /market            # transfer, penawaran, negosiasi, scouting
    /ai                # keputusan organisasi non-pemain
    /history           # catatan hasil, ringkasan musim, retensi
    /worldgen          # pembentukan dunia dari seed + validator
    /persistence       # skema simpan, migrasi, serialisasi (murni; adapter IndexedDB ada di /worker)
    /api               # fasad publik: perintah + query + event ke luar
  /worker              # entry Web Worker, Comlink, penjadwalan batch
  /ui
    /design-system     # token, komponen dasar
    /shell             # layout, navigasi, routing, notifikasi
    /features          # satu folder per halaman (dashboard, peta, dst.)
  /render
    /map               # MapLibre wrapper, layer, fallback
    /babylon           # engine, scene, loader aset, profil kualitas
  /data                # seed statis: negara, kota, nama, template liga
/tests
  /unit /integration /e2e /simulation /regression
/docs
```

**Aturan impor (ditegakkan oleh lint):**
`ui` dan `render` → hanya boleh mengimpor `sim-core/api` (tipe) dan `worker` client.
`sim-core/*` → tidak boleh mengimpor `ui`, `render`, `worker`, atau API browser.
Antar-modul `sim-core` → hanya lewat antarmuka publik modul (`index.ts`), tidak boleh menjangkau file internal.

## 4. Modul dan tanggung jawabnya

| Modul | Memiliki (source of truth) | Tidak boleh |
|-------|---------------------------|-------------|
| kernel | ID, RNG, event bus, command bus | Mengetahui aturan olahraga |
| world | Negara, kota, zona waktu, fasilitas, jarak | Mengelola klub atau atlet |
| time | Tanggal game, scheduler, kecepatan | Menentukan hasil pertandingan |
| organization | Organisasi, divisi, kewenangan, target | Mengubah kas langsung (lewat economy) |
| people | Atlet, staf, kontrak, kondisi | Menjadwalkan pertandingan |
| competition | Format, peserta, jadwal, klasemen | Menghitung skor |
| sport-rules | Aturan, atribut, posisi, format khas olahraga | Menyimpan state dunia |
| match | Simulasi satu event (pertandingan atau balapan) | Mengubah klasemen langsung (mengirim hasil) |
| economy | Buku besar semua transaksi | Memutuskan transfer |
| market | Penawaran, negosiasi, laporan scouting | Menulis kontrak langsung (lewat people) |
| ai | Keputusan organisasi non-pemain, lewat perintah yang sama dengan pemain | Mengakses data yang tidak boleh diketahui organisasi tersebut |
| history | Hasil, ringkasan, retensi | Mengubah data aktif |
| worldgen | Pembuatan dunia + validator | Berjalan saat game berlangsung |
| persistence | Format simpan, migrasi | Aturan game |

**Prinsip penting:** AI memakai *command bus yang sama* dengan pemain. Jadi aturan (anggaran, kewenangan, kuota roster) hanya ditulis sekali dan berlaku untuk semua.

## 5. Kontrak antarmodul

### 5.1 Perintah, query, event

```ts
// Perintah: mengubah dunia. Selalu divalidasi, mengembalikan Result.
type Result<T, E = DomainError> = { ok: true; value: T } | { ok: false; error: E };

interface CommandBus {
  dispatch<C extends Command>(cmd: C): Result<CommandOutcome<C>>;
}

// Query: hanya membaca, tanpa efek samping.
interface QueryApi {
  organization(id: OrganizationId): OrganizationView | undefined;
  upcomingEvents(org: OrganizationId, limit: number): EventView[];
  finances(org: OrganizationId): FinanceSummary;
  // ...
}

// Event: pemberitahuan ke luar (UI, history, notifikasi).
interface EventStream {
  subscribe(filter: EventFilter, handler: (e: GameEvent) => void): Unsubscribe;
}
```

### 5.2 Plugin olahraga

```ts
interface SportModule {
  id: SportId;                           // 'volleyball' | 'basketball' | 'football' | 'motorsport'
  eventKind: 'head-to-head' | 'multi-competitor'; // dua sisi vs banyak peserta
  attributeSchema: AttributeSchema;      // atribut atlet khas olahraga
  positions: PositionDef[];              // motorsport: peran (pembalap utama, cadangan, dst.)
  rosterRules: RosterRules;              // min/maks, komposisi
  competitionRules: CompetitionRuleSet;  // klasemen, tie-break, poin
  simulateEvent(input: EventInput, rng: Rng, detail: DetailLevel): EventResult;
  estimateStrength(entry: Entry): number; // simulasi LOD rendah (susunan pemain atau paket pembalap+kendaraan)
}
```

Menambah cabang olahraga = menambah satu `SportModule`, tanpa mengubah modul lain.

### 5.4 Empat cabang olahraga

Angka di tabel adalah **usulan awal** untuk titik mulai. Aturan resmi per liga ditentukan oleh `CompetitionRuleSet` dan dapat berbeda antar kompetisi.

| | Voli | Basket | Sepak bola | Motorsport |
|---|------|--------|-----------|------------|
| Jenis event | head-to-head | head-to-head | head-to-head | multi-competitor |
| Yang bertanding | tim (6 di lapangan + libero) | tim (5 di lapangan) | tim (11 di lapangan) | pembalap + kendaraan milik tim |
| Satuan simulasi detail (LOD 0) | rally demi rally | possession demi possession | momen/peluang | lap demi lap (strategi pit, ban, cuaca, insiden) |
| Hasil | skor set, pemenang | skor, pemenang (perpanjangan waktu) | skor (perpanjangan, adu penalti pada laga gugur) | klasifikasi akhir, lap tercepat, yang gagal finis |
| Klasemen | poin liga, playoff | rekor menang-kalah, playoff seri | poin, selisih gol, promosi/degradasi | dua tabel: pembalap dan tim (konstruktor) |
| Roster | sekitar 12–14 | sekitar 12–15 | sekitar 22–30 | pembalap utama + cadangan, ditambah kendaraan dan staf teknis |
| Atribut khas | serve, spike, block, receive, set, defense | shooting, passing, rebound, defense, athleticism | passing, dribbling, shooting, defending, stamina | kecepatan, konsistensi, racecraft, kualifikasi, manajemen ban |
| Venue | arena | arena | stadion | sirkuit (Facility bertipe `circuit`, punya koordinat di peta) |

**Dampak motorsport pada arsitektur** (karena struktur berbeda dari olahraga tim):

1. Entitas jadwal bersifat umum: `CompetitionEvent` dengan daftar peserta, bukan hanya `homeOrgId` dan `awayOrgId`. Hasilnya `EventResult` (skor dan set, atau klasifikasi balapan).
2. Ada entitas `Vehicle` (kendaraan) dengan performa, keandalan, kondisi, dan pengembangan; kendaraan ikut dalam `estimateStrength` dan anggaran.
3. Satu akhir pekan balap bisa berisi beberapa sesi (latihan, kualifikasi, balapan) yang menjadi sub-event.
4. Kalender motorsport bersifat global dan lintas benua, sehingga logistik, biaya perjalanan, dan zona waktu sangat berpengaruh (data dari modul `world`).
5. Klasemen ganda (pembalap dan tim) dihitung dari klasifikasi balapan yang sama.
6. Organisasi motorsport memiliki sumber daya teknis (insinyur, mekanik) yang memengaruhi performa kendaraan.

### 5.3 Worker API (batas UI ↔ inti)

```ts
interface SimWorkerApi {
  newGame(opts: NewGameOptions): Promise<Result<GameSummary>>;
  loadGame(slot: SlotId): Promise<Result<GameSummary>>;
  saveGame(slot: SlotId): Promise<Result<void>>;
  dispatch(cmd: Command): Promise<Result<unknown>>;
  query<K extends keyof QueryApi>(k: K, ...a: Parameters<QueryApi[K]>): Promise<ReturnType<QueryApi[K]>>;
  setSpeed(s: GameSpeed): void;           // pause / 1x / 2x / 4x / lompat ke kejadian berikut
  subscribe(filter: EventFilter, cb: (e: GameEvent) => void): Promise<Unsubscribe>;
}
```

Data yang melintasi worker dikirim sebagai objek polos (structured clone). Tidak ada instance kelas yang dibagi.

## 6. Model data awal

### 6.1 ID entitas

- Bentuk: `<prefix>_<nomor>`, contoh `ath_000184`, `org_000032`, `cmp_000007`.
- Nomor berasal dari **penghitung per tipe** yang disimpan di meta dunia, sehingga deterministik dan tidak bergantung waktu atau `Math.random`.
- Di TypeScript memakai *branded type* (`AthleteId`, `OrganizationId`, dst.) agar ID antar-tipe tidak tertukar.
- ID tidak pernah dipakai ulang, bahkan setelah entitas dihapus atau pensiun.

### 6.2 Entitas inti (versi awal, akan diperinci per fase)

| Entitas | Field utama | Relasi (selalu lewat ID) |
|---------|-------------|--------------------------|
| Country | id, name, isoCode, economyIndex, sportEcosystem[sport] | punya City |
| City | id, countryId, name, lat, lon, timezone, population | punya Facility |
| Facility | id, cityId, type (stadion, arena, sirkuit, pusat latihan, akademi, …), capacity, quality, ownerOrgId? | milik Organization |
| Organization | id, name, kind, sportIds[], cityId, parentOrgId?, reputation, budgetPolicy | punya Division, Contract |
| Division | id, orgId, sportId, level | punya Roster |
| Athlete | id, name, birthDate, nationalityId, sportId, attributes, potential, condition | punya Contract |
| Staff | id, name, role, skills, nationalityId | punya Contract |
| Contract | id, personId, orgId, start, end, wage, clauses | menghubungkan Person–Organization |
| Vehicle | id, orgId, spec, performance, reliability, condition | khusus motorsport; milik Organization |
| Competition | id, sportId, format, level, countryId?, rules | punya Season |
| Season | id, competitionId, year, participantOrgIds[], stage | punya CompetitionEvent, Standing |
| CompetitionEvent | id, seasonId, instant, venueId, kind, participants[] (orgId + susunan atau entri), status, resultId? | satu tipe untuk pertandingan dua sisi dan balapan banyak peserta |
| EventResult | id, eventId, hasil (skor/set atau klasifikasi balapan), summary, eventsRef? | — |
| LedgerEntry | id, orgId, date, category, amount, refId? | — |
| Sponsor | id, name, tier, orgId?, value, expires | — |
| Message | id, orgId, date, kind (info/peringatan/keputusan/laporan), target link, status | — |
| KnowledgeState | orgId, entityRef, knowledgeLevel | dasar scouting dan info terbatas peta |

Catatan: nama klub, atlet, liga, dan perusahaan **fiktif**; geografi (negara, kota, koordinat, zona waktu) nyata.

### 6.3 Aturan validasi (invarian)

Dijalankan oleh `validateWorld()` setelah worldgen, setelah load, dan oleh tes simulasi massal:

1. Semua referensi ID menunjuk entitas yang ada.
2. Tidak ada atlet dengan dua kontrak aktif pada divisi yang melanggar aturan olahraga tersebut.
3. Jumlah roster setiap divisi dalam batas `rosterRules`.
4. Setiap kompetisi punya peserta cukup untuk formatnya, dan tidak ada organisasi mengikuti dua event di waktu yang bersinggungan.
5. Jadwal mematuhi jarak dan waktu perjalanan minimal antar lokasi.
6. Klasemen konsisten dengan hasil (jumlah main, poin, selisih).
7. `saldo kas = saldo awal + jumlah LedgerEntry` untuk setiap organisasi.
8. Tanggal kontrak valid (mulai < berakhir), tanggal lahir masuk akal untuk olahraganya.
9. Tidak ada nilai NaN/Infinity pada atribut dan keuangan.
10. Motorsport: setiap entri balapan punya pembalap dan kendaraan yang sah; jumlah peserta tidak melebihi kapasitas grid sirkuit.
11. Klasemen motorsport (pembalap dan tim) konsisten dengan klasifikasi balapan.

## 7. Waktu, kalender, simulasi cepat, simulasi latar belakang, riwayat

### 7.1 Jam dan scheduler

- Satuan dasar: **hari game**. Pertandingan dan acara harian memakai slot waktu di dalam hari.
- `Scheduler` = antrean prioritas berisi acara `(tanggal, prioritas, id, handler)`. Pemrosesan urut dan deterministik; tie-break memakai ID.
- Zona waktu disimpan per kota; jadwal disimpan dalam UTC dan ditampilkan dalam zona waktu lokasi atau pemain.
- Kalender dihitung dengan fungsi murni sendiri (bukan `Date` lokal browser) agar hasil sama di semua perangkat.

### 7.2 Kecepatan dan lompat waktu

- Kecepatan: jeda, 1 hari/detik, 4 hari/detik, dan "lompat sampai kejadian berikutnya".
- Pemrosesan berjalan di worker per **batch hari**, dengan jeda antar batch agar worker tetap responsif terhadap perintah jeda.
- **Interupsi wajib:** simulasi berhenti otomatis saat ada keputusan wajib, pertandingan pemain, kontrak kritis, atau peristiwa krisis. Daftar pemicu dapat dikonfigurasi.

### 7.3 Simulasi latar belakang (LOD)

| Tingkat | Cakupan | Perlakuan |
|---------|---------|-----------|
| 0 | Organisasi pemain, pertandingannya | Simulasi penuh, peristiwa rinci disimpan |
| 1 | Rival, kompetisi yang diikuti pemain, target scouting | Event disimulasikan lewat `simulateEvent` dengan detail rendah |
| 2 | Sisa dunia | Hasil dari `estimateStrength` + distribusi statistik; atlet diperbarui bulanan secara batch |

Pemain bisa menaikkan tingkat sebuah entitas (misal mulai memantau liga baru); sistem membangun detail yang diperlukan sejak titik itu.

### 7.4 Riwayat dan retensi

- Catatan **append-only** yang ringkas: hasil, juara, transfer, ringkasan musim per entitas.
- Peristiwa pertandingan rinci hanya disimpan untuk tingkat 0, N musim terakhir (nilai awal usulan: 3), lalu dipadatkan menjadi statistik.
- Tujuan: ukuran simpanan tumbuh *sublinear* terhadap lamanya permainan.

## 8. Rendering dan aset

### 8.1 Peta (MapLibre GL JS)

- Geografi: batas negara dan kota dari data publik (Natural Earth untuk batas dan tempat berpenduduk, domain publik; GeoNames untuk kota, lisensi CC BY 4.0, wajib atribusi). Data digabung menjadi seed statis di `/data`.
- Tile dasar: tahap pengembangan memakai penyedia tile terbuka tanpa kunci; untuk rilis, **self-host PMTiles** (ekstrak data OpenStreetMap, atribusi ODbL) agar tidak bergantung kuota dan kebijakan pihak ketiga. **Syarat dan batas pemakaian setiap penyedia harus diperiksa pada saat dipilih; saya tidak mengklaim penyedia tertentu aman sebelum diperiksa.**
- **Fallback:** jika tile gagal dimuat, peta tetap menampilkan batas negara dan kota dari GeoJSON lokal (bukan layar kosong), disertai pesan status.
- Layer game (organisasi, fasilitas, kompetisi, peluang) berasal dari `QueryApi` yang sama dengan dashboard, sehingga sumber datanya satu.
- Informasi lokasi dibatasi oleh `KnowledgeState` (tingkat scouting).

### 8.2 3D (Babylon.js)

- Dimuat malas: chunk 3D hanya diunduh saat layar yang membutuhkannya dibuka.
- Aset glTF dengan kompresi Draco/Meshopt dan tekstur KTX2; tampilan awal memakai versi resolusi rendah, versi penuh menyusul.
- **Profil kualitas** (rendah/sedang/tinggi): pilihan awal otomatis dari deteksi perangkat, dapat diubah pemain. Mengatur resolusi render, bayangan, jumlah instance, dan batas bingkai.
- Menangani kehilangan konteks WebGL (Babylon menyediakan observable context lost/restored): pulihkan atau turun ke tampilan 2D.
- Impor modular dari `@babylonjs/core/...` (bukan paket UMD `babylonjs`) agar tree-shaking bekerja. Bundle Babylon umumnya lebih besar dari Three.js, jadi chunk 3D punya anggaran sendiri (§9).
- Default WebGL2. WebGPU hanya opsional jika terdeteksi dan terbukti stabil di perangkat target.
- Fisika dan animasi di Babylon hanya untuk visual. **Hasil pertandingan dan balapan selalu berasal dari `sim-core`**, bukan dari mesin fisika, supaya deterministik dan dapat diuji.
- React tidak mengelola scene graph: komponen hanya membuat dan membuang `Engine`/`Scene`. Inspector Babylon hanya untuk mode pengembangan.
- **Batasan yang harus disepakati:** aset 3D bergaya stylized berkualitas tinggi (stadion, arena, kendaraan) tidak muncul dengan sendirinya. Harus dibuat, dibeli, atau diambil dari sumber berlisensi (misalnya aset CC0), dan setiap aset dicatat lisensinya di `/docs/asset-licenses.md`. Rencana: **tampilan 2D/UI dan data lebih dulu; 3D adalah fase peningkatan** setelah sistem inti stabil.
- Pertandingan versi awal: tampilan 2D top-down/teks terstruktur dari `EventResult`; 3D menyusul sebagai penonton atas data yang sama.

### 8.3 Responsif dan performa UI

- Desain *mobile-first*: kartu, panel layar penuh, bottom navigation di HP; sidebar dan multi-panel di desktop.
- Tabel besar memakai virtualisasi dan mode kartu di HP (tidak ada tabel lebar yang memaksa zoom).
- Rute dipecah per fitur (code splitting). Pencarian dan filter dijalankan di worker bila datanya besar.

## 9. Anggaran performa (TARGET awal, harus diukur di Fase 1)

Angka di bawah adalah **asumsi perencanaan**, bukan hasil ukur.

| Item | Target |
|------|--------|
| Waktu hingga menu utama dapat dipakai (jaringan 4G) | < 4 detik |
| Bundle awal (JS terkompresi, tanpa 3D dan peta) | < 300 KB |
| Chunk 3D Babylon (terkompresi), dimuat hanya di layar 3D | < 1,5 MB (ukur setelah Fase 10 dimulai) |
| Memori worker, dunia berpenghuni di HP | < 150 MB |
| Satu hari game, dunia berpenghuni, mode cepat | < 50 ms rata-rata |
| Satu musim penuh simulasi lompat waktu | < 10 detik di desktop, < 30 detik di HP |
| Ukuran satu simpanan setelah 10 musim | < 50 MB (terkompresi) |
| Bingkai UI | 60 fps normal, 30 fps minimum di 3D profil rendah |

**Strategi data di memori:** mulai dengan `Map<ID, Entity>` objek polos (sederhana, mudah diuji). Jika pengukuran Fase 1 menunjukkan melewati anggaran memori, atlet beralih ke penyimpanan kolom (typed array) untuk atribut panas. Keputusan berdasarkan data, bukan dugaan.

## 10. Penyimpanan

- **IndexedDB (Dexie)**, satu *object store* per jenis entitas, kunci = ID.
- **Autosave inkremental:** hanya entitas yang berubah ("dirty set") ditulis, dilakukan di worker.
- Tiga slot manual + satu autosave bergilir.
- Metadata `schemaVersion`; migrasi berjenjang `v(n) → v(n+1)` dengan tes untuk setiap migrasi.
- **Ekspor/impor** berkas simpanan (JSON terkompresi lewat `CompressionStream`), divalidasi Zod sebelum dimuat. Ini juga cadangan bagi pemain bila browser menghapus data.
- Memanggil `navigator.storage.persist()` dan memantau `navigator.storage.estimate()`; tampilkan peringatan jelas jika kuota hampir habis.

## 11. Strategi pengujian

| Lapisan | Alat | Isi |
|---------|------|-----|
| Unit | Vitest | Fungsi murni: RNG, kalender, klasemen, keuangan, aturan kontrak |
| Properti | fast-check | Invarian: roster dalam batas, kas = jumlah buku besar, jadwal tanpa bentrok |
| Kontrak | Vitest | Setiap modul memenuhi antarmuka publiknya; SportModule lolos suite standar |
| Integrasi | Vitest (Node, inti tanpa UI) | Alur: buat dunia → main musim → transfer → simpan → muat |
| Simulasi massal | Skrip Node headless | Ratusan–ribuan musim lintas banyak seed; cek invarian, deteksi macet, distribusi hasil wajar (tidak ada klub yang selalu menang tanpa sebab) |
| Regresi | Snapshot per seed | Hash hasil dunia/musim dari seed tetap; perubahan harus disengaja dan dijelaskan |
| Migrasi | Vitest | Muat fixture simpanan versi lama, pastikan valid |
| E2E | Playwright | Navigasi, back/refresh, filter, state kosong, viewport HP dan desktop |
| Performa | Benchmark Node + Lighthouse | Cek terhadap anggaran §9, gagal CI jika melonjak |
| Aksesibilitas | axe + tes keyboard | Kontras, label, fokus |

CI minimal: lint, typecheck, unit, properti, regresi seed, build. Simulasi massal dan E2E berjalan terjadwal atau sebelum rilis.

## 12. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Ledakan jumlah entitas dan AI | Lambat, memori habis | LOD 0/1/2, anggaran terukur sejak Fase 1, batas keputusan AI per hari |
| Non-determinisme (urutan iterasi, `Date`, `Math.random`) | Regresi tidak bisa dipercaya | Satu RNG ber-seed dengan aliran terpisah per subsistem, lint melarang `Math.random` di `sim-core` |
| Simpanan membengkak | Kuota habis | Retensi riwayat, kompresi, ekspor |
| iOS Safari mengosongkan data situs yang lama tidak dibuka | Pemain kehilangan save | `persist()`, ekspor manual, pengingat ekspor berkala |
| Tab latar belakang di-throttle | Simulasi terputus | Simulasi dapat dilanjutkan dari state tersimpan; tidak mengandalkan timer latar belakang |
| Lisensi data peta/aset | Masalah hukum | Daftar lisensi, self-host PMTiles, atribusi wajib di UI |
| Lingkup terlalu besar (4 olahraga + 3D + dunia nyata) | Proyek macet | Roadmap dependensi, tiap fase punya kriteria selesai, 3D belakangan |
| Keseimbangan game sulit | Tidak menyenangkan | Simulasi massal sebagai alat penyetelan sejak awal |
| Kompleksitas aturan tiap olahraga | Bug lintas modul | Plugin SportModule + suite tes kontrak |
| Motorsport tidak muat di model pertandingan dua sisi | Desain ulang data di tengah jalan | `CompetitionEvent` dan `EventResult` umum sejak awal |
| Bundle Babylon.js besar | Muat lambat di HP | Impor modular, chunk terpisah, anggaran sendiri |

## 13. Batasan browser (yang tidak bisa dihindari)

- Tidak ada akses filesystem bebas dan tidak ada proses latar belakang saat tab ditutup.
- IndexedDB punya kuota dan bisa dibersihkan browser; tidak ada jaminan penyimpanan permanen.
- Worker tidak punya DOM; WebGL hanya di thread utama (OffscreenCanvas belum bisa diandalkan di semua browser target).
- Memori HP terbatas dan tab bisa dimatikan sistem kapan saja.
- `SharedArrayBuffer` butuh header isolasi lintas-origin (COOP/COEP) yang mempersulit hosting dan penyematan; **sengaja dihindari**.
- Tile peta dan aset butuh jaringan; mode offline hanya mencakup yang di-cache.

## 14. Alternatif yang ditolak

| Alternatif | Alasan ditolak |
|-----------|----------------|
| Unity / Godot WebGL | Unduhan besar, berat di HP, UI dashboard padat data lebih sulit dibanding web native |
| Phaser sebagai kerangka utama | Bagus untuk game aksi; game ini 90% UI dan data |
| Menjalankan simulasi di thread utama | UI membeku saat lompat waktu |
| Redux/Zustand sebagai penyimpan state dunia | Dunia besar butuh penyimpanan terindeks, deterministik, dan di luar render loop |
| localStorage | Kuota kecil, sinkron, tidak cocok untuk data besar |
| Google Maps / Mapbox | Kunci API, kuota, biaya, dan syarat layanan membatasi penggunaan game |
| Peta statis bergambar dengan pin | Melanggar syarat: interaksi lokasi harus berfungsi |
| Three.js + React Three Fiber | Diganti atas pilihan Anda dengan Babylon.js. Konsekuensi: bundle lebih besar, kompensasinya engine lebih lengkap |
| Satu model pertandingan dua sisi untuk semua olahraga | Tidak cocok untuk motorsport (banyak peserta, klasemen ganda, kendaraan) |
| Server backend sejak awal | Menambah biaya dan kompleksitas; game satu pemain tidak membutuhkannya. Bisa ditambahkan nanti untuk cloud save |
| ECS penuh (Entity-Component-System) sejak awal | Rumit untuk model domain beragam ini; dipertimbangkan hanya untuk jalur panas jika pengukuran menuntut |

## 15. Roadmap implementasi (berdasarkan dependensi)

| Fase | Isi | Bergantung pada | Kriteria selesai |
|------|-----|-----------------|------------------|
| 0 | Repo, TypeScript, Vite, lint, CI, token desain awal | — | Build dan CI hijau, aturan impor ditegakkan |
| 1 | Kernel: ID, RNG, clock, scheduler, event/command bus, persistence dasar, worker + RPC | 0 | Tes determinisme lolos; simpan–muat roundtrip; ukur anggaran awal |
| 2 | World data + worldgen + validator (**Prompt 05**) | 1 | Dunia kosong dan berpenghuni lolos `validateWorld` untuk banyak seed |
| 3 | Organisasi, atlet, staf, kontrak, ekonomi dasar | 2 | Invarian kontrak dan keuangan lolos tes properti |
| 4 | Kompetisi, kalender, klasemen (format liga, gugur, grup, promosi/degradasi) | 3 | Simulasi massal satu musim tanpa bentrok jadwal |
| 5 | SportModule + mesin event: sepak bola dulu, lalu basket, voli, dan motorsport (paling berbeda, dikerjakan terpisah) | 4 | Distribusi hasil wajar per olahraga; suite kontrak lolos |
| 6 | UI shell + design system (**Prompt 02**), dapat dimulai paralel setelah Fase 1 dengan data tiruan | 1 | Navigasi, state kosong/error/loading, uji HP dan desktop |
| 7 | Dashboard dan notifikasi (**Prompt 03**) | 3, 4, 6 | Setiap notifikasi terhubung ke halaman atau tindakan |
| 8 | Peta dunia (**Prompt 04**) | 2, 6 | Pilih lokasi, zoom, filter, fallback tile, sinkron dengan data organisasi |
| 9 | Pasar transfer, scouting, akademi, AI organisasi | 3, 5, 7 | AI patuh aturan yang sama dengan pemain |
| 10 | 3D (Babylon.js): stadion, arena, sirkuit, kendaraan, aset penting | 8, aset berlisensi | Profil kualitas HP/desktop, fallback 2D |
| 11 | Penyetelan keseimbangan, aksesibilitas, performa, hardening | semua | Anggaran §9 terpenuhi, regresi bersih |

**Status saat ini:** Fase 0 selesai (perkakas, aturan batas modul). Fase 1 sebagian: kernel (ID, RNG, kalender, scheduler, event bus) sudah ada dan teruji; belum ada worker + RPC, adapter IndexedDB, dan pengukuran anggaran.

Urutan Prompt 02–05 mengikuti dependensi di atas: **Prompt 05 (worldgen) lebih dulu dari Prompt 04 (peta)** karena peta memerlukan data dunia.

## 16. Keputusan yang perlu Anda setujui

1. Stack di §1 (React, Vite, TypeScript, worker, IndexedDB, MapLibre, Babylon.js).
2. Satu pemain, offline-first, tanpa server.
3. 3D sebagai fase peningkatan, bukan fondasi.
4. Urutan roadmap di §15.
5. Jenis motorsport (default sementara: balap roda terbuka bergaya Formula, fiktif).
