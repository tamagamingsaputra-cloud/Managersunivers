/** ID entitas unik, berprefiks, deterministik (berbasis penghitung yang ikut disimpan di save). */

export type IdPrefix = 'cty' | 'cit' | 'org' | 'ath' | 'stf' | 'cmp' | 'ctr' | 'mch';
export type EntityId<P extends IdPrefix = IdPrefix> = `${P}_${string}`;
export type IdCounters = Partial<Record<IdPrefix, number>>;

const ID_PATTERN = /^(cty|cit|org|ath|stf|cmp|ctr|mch)_[0-9a-z]{5,}$/;

export function isEntityId(value: unknown, prefix?: IdPrefix): value is EntityId {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) return false;
  return prefix === undefined || value.startsWith(`${prefix}_`);
}

export class IdGenerator {
  /** `counters` dipegang by reference agar state game selalu ikut ter-update. */
  constructor(private readonly counters: IdCounters = {}) {}

  next<P extends IdPrefix>(prefix: P): EntityId<P> {
    const n = (this.counters[prefix] ?? 0) + 1;
    this.counters[prefix] = n;
    return `${prefix}_${n.toString(36).padStart(5, '0')}` as EntityId<P>;
  }

  snapshot(): IdCounters {
    return { ...this.counters };
  }
}
