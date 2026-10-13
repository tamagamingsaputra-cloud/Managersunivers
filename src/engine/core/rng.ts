/** PRNG deterministik (mulberry32). State hanya satu angka 32-bit, mudah disimpan. */

export function hashSeed(seed: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export class Rng {
  private s: number;

  constructor(state: number) {
    this.s = state >>> 0;
  }

  static fromSeed(seed: string): Rng {
    return new Rng(hashSeed(seed));
  }

  get state(): number {
    return this.s;
  }

  /** Float di [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer inklusif [min, max]. */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Rng.int: rentang tidak valid (${min}, ${max})`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Rng.pick: daftar kosong');
    return items[this.int(0, items.length - 1)] as T;
  }

  gaussian(mean = 0, sd = 1): number {
    const u = 1 - this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
