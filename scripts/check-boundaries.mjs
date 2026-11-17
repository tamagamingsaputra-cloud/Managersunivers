// Penegak aturan batas modul untuk src/sim-core (lihat docs/ARCHITECTURE.md §3).
// Pemeriksaan bersifat heuristik berbasis teks, bukan pengganti tinjauan kode.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'src/sim-core');

const FORBIDDEN_PACKAGES = [/^react($|\/)/, /^react-dom($|\/)/, /^@babylonjs\//, /^babylonjs($|\/)/, /^maplibre-gl($|\/)/, /^zustand($|\/)/, /^dexie($|\/)/, /^comlink($|\/)/];
const FORBIDDEN_PATH_PARTS = ['/ui/', '/render/', '/worker/'];
const FORBIDDEN_TOKENS = [
  [/\bMath\.random\b/, 'Math.random (pakai Rng ber-seed)'],
  [/\bDate\.now\b/, 'Date.now (pakai jam game)'],
  [/\bnew\s+Date\b/, 'new Date (pakai kalender game)'],
  [/\bperformance\.now\b/, 'performance.now'],
  [/\bdocument\./, 'document (DOM)'],
  [/\bwindow\b/, 'window (DOM)'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bsessionStorage\b/, 'sessionStorage'],
  [/\bindexedDB\b/, 'indexedDB (pakai adapter di /worker)'],
  [/\bfetch\s*\(/, 'fetch (sim-core tidak melakukan I/O)'],
  [/\bsetTimeout\b|\bsetInterval\b|\brequestAnimationFrame\b/, 'timer (sim-core tidak memakai timer)'],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
  });
}

/** Menghapus komentar; string dihapus jika keepStrings=false. */
function scan(src, keepStrings) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i++; }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const start = i;
      i++;
      while (i < n && src[i] !== c) { if (src[i] === '\\') i++; i++; }
      i++;
      out += keepStrings ? src.slice(start, i) : '""';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const IMPORT_RE = /(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const violations = [];
const fail = (file, msg) => violations.push(`${path.relative(process.cwd(), file)}: ${msg}`);

for (const file of walk(root)) {
  const src = readFileSync(file, 'utf8');
  const withStrings = scan(src, true);
  for (const m of withStrings.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec.startsWith('.')) {
      const target = path.resolve(path.dirname(file), spec);
      const rel = path.relative(root, target);
      if (rel.startsWith('..') || path.isAbsolute(rel)) { fail(file, `impor keluar dari sim-core: ${spec}`); continue; }
      const segs = rel.split(path.sep).filter(Boolean);
      const fromSegs = path.relative(root, file).split(path.sep);
      const fromModule = fromSegs.length > 1 ? fromSegs[0] : null;
      const toModule = segs[0];
      if (fromModule !== null && toModule !== fromModule) {
        const rest = segs.slice(1).join('/').replace(/\.ts$/, '');
        if (rest !== '' && rest !== 'index') fail(file, `impor lintas modul harus lewat index.ts: ${spec}`);
      }
    } else {
      if (FORBIDDEN_PACKAGES.some((re) => re.test(spec))) fail(file, `paket terlarang di sim-core: ${spec}`);
      if (FORBIDDEN_PATH_PARTS.some((p) => `/${spec}/`.includes(p))) fail(file, `jalur terlarang di sim-core: ${spec}`);
    }
  }
  const code = scan(src, false);
  for (const [re, label] of FORBIDDEN_TOKENS) if (re.test(code)) fail(file, `API terlarang: ${label}`);
}

if (violations.length > 0) {
  console.error(`Pelanggaran batas modul (${violations.length}):\n- ${violations.join('\n- ')}`);
  process.exit(1);
}
console.log('Batas modul sim-core: OK');
