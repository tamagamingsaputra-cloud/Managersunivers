/**
 * RNG ber-seed (sfc32), deterministik, dengan aliran turunan per namespace.
 * Jangan ubah algoritma ini setelah ada simpanan: urutan angka akan berubah dan
 * dunia dari seed yang sama tidak akan identik lagi. (Dijaga oleh tes golden.)
 */

export interface RngState {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface Rng {
  readonly seed: string;
  /** Bilangan pecahan di [0, 1). */
  next(): number;
  /** Bilangan bulat di [min, max], keduanya inklusif. */
  int(min: number, max: number): number;
  /** Bilangan pecahan di [min, max). */
  float(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Mengembalikan salinan teracak; input tidak diubah. */
  shuffle<T>(items: readonly T[]): T[];
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** Distribusi normal (Box-Muller). Memakai dua tarikan seragam per panggilan. */
  normal(mean?: number, sd?: number): number;
  /**
   * Aliran independen yang diturunkan dari seed dan namespace.
   * Tidak mengonsumsi state induk. Namespace yang sama selalu menghasilkan aliran yang sama.
   */
  fork(namespace: string): Rng;
  getState(): RngState;
}

function xmur3(str: string): () => number {
  let h = (1779033703 ^ str.length) | 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function createRng(seed: string | number, state?: RngState): Rng {
  const seedText = String(seed);
  let a: number;
  let b: number;
  let c: number;
  let d: number;

  function step(): number {
    const t0 = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const t = (t0 + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  if (state !== undefined) {
    a = state.a | 0;
    b = state.b | 0;
    c = state.c | 0;
    d = state.d | 0;
  } else {
    const h = xmur3(seedText);
    a = h() | 0;
    b = h() | 0;
    c = h() | 0;
    d = h() | 0;
    for (let i = 0; i < 15; i++) step();
  }

  const rng: Rng = {
    seed: seedText,
    next: step,
    int(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
        throw new RangeError(`Rentang int tidak valid: [${String(min)}, ${String(max)}]`);
      }
      return min + Math.floor(step() * (max - min + 1));
    },
    float(min, max) {
      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
        throw new RangeError(`Rentang float tidak valid: [${String(min)}, ${String(max)}]`);
      }
      return min + step() * (max - min);
    },
    chance(probability) {
      if (!(probability >= 0 && probability <= 1)) {
        throw new RangeError(`Probabilitas harus di [0, 1], diterima: ${String(probability)}`);
      }
      return step() < probability;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new RangeError('pick() pada daftar kosong');
      return items[Math.floor(step() * items.length)] as T;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(step() * (i + 1));
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
    weighted<T>(items: readonly T[], weights: readonly number[]): T {
      if (items.length === 0 || items.length !== weights.length) {
        throw new RangeError('weighted() butuh daftar tidak kosong dengan jumlah bobot yang sama');
      }
      let total = 0;
      for (const w of weights) {
        if (!Number.isFinite(w) || w < 0) throw new RangeError(`Bobot tidak valid: ${String(w)}`);
        total += w;
      }
      if (total <= 0) throw new RangeError('Jumlah bobot harus > 0');
      let r = step() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i] as number;
        if (r < 0) return items[i] as T;
      }
      // Hanya tercapai akibat pembulatan floating point: pilih item terakhir berbobot > 0.
      for (let i = items.length - 1; i >= 0; i--) {
        if ((weights[i] as number) > 0) return items[i] as T;
      }
      throw new RangeError('Jumlah bobot harus > 0');
    },
    normal(mean = 0, sd = 1) {
      if (!Number.isFinite(mean) || !Number.isFinite(sd) || sd < 0) {
        throw new RangeError('Parameter normal tidak valid');
      }
      const u1 = 1 - step();
      const u2 = step();
      return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    fork(namespace) {
      return createRng(`${seedText}::${namespace}`);
    },
    getState() {
      return { a: a >>> 0, b: b >>> 0, c: c >>> 0, d: d >>> 0 };
    },
  };
  return rng;
}
