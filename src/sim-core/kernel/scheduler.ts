/**
 * Antrean acara berurutan dan deterministik.
 * Urutan: waktu (`at`) naik, lalu `priority` naik (angka kecil lebih dulu), lalu `id` (urutan masuk).
 * Acara hanya berisi data (`type` + `payload`), bukan fungsi, supaya dapat disimpan dan dimuat.
 */
import type { Instant } from './calendar.ts';

export interface ScheduledItem<P = unknown> {
  readonly id: number;
  readonly at: Instant;
  readonly priority: number;
  readonly type: string;
  readonly payload: P;
}

export interface ScheduleInput<P> {
  readonly at: Instant;
  readonly priority?: number;
  readonly type: string;
  readonly payload: P;
}

export interface SchedulerSnapshot<P = unknown> {
  readonly items: readonly ScheduledItem<P>[];
  readonly nextId: number;
}

export interface Scheduler<P = unknown> {
  schedule(input: ScheduleInput<P>): ScheduledItem<P>;
  /** true jika acara masih menunggu dan berhasil dibatalkan. */
  cancel(id: number): boolean;
  peek(): ScheduledItem<P> | undefined;
  pop(): ScheduledItem<P> | undefined;
  readonly size: number;
  snapshot(): SchedulerSnapshot<P>;
}

function compare(x: ScheduledItem<unknown>, y: ScheduledItem<unknown>): number {
  if (x.at !== y.at) return x.at - y.at;
  if (x.priority !== y.priority) return x.priority - y.priority;
  return x.id - y.id;
}

export function createScheduler<P = unknown>(snapshot?: SchedulerSnapshot<P>): Scheduler<P> {
  const heap: ScheduledItem<P>[] = [];
  const live = new Map<number, ScheduledItem<P>>();
  let nextId = 1;

  function siftUp(index: number): void {
    let i = index;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (compare(heap[i] as ScheduledItem<P>, heap[parent] as ScheduledItem<P>) >= 0) break;
      const tmp = heap[i] as ScheduledItem<P>;
      heap[i] = heap[parent] as ScheduledItem<P>;
      heap[parent] = tmp;
      i = parent;
    }
  }

  function siftDown(index: number): void {
    let i = index;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < heap.length && compare(heap[left] as ScheduledItem<P>, heap[smallest] as ScheduledItem<P>) < 0) smallest = left;
      if (right < heap.length && compare(heap[right] as ScheduledItem<P>, heap[smallest] as ScheduledItem<P>) < 0) smallest = right;
      if (smallest === i) break;
      const tmp = heap[i] as ScheduledItem<P>;
      heap[i] = heap[smallest] as ScheduledItem<P>;
      heap[smallest] = tmp;
      i = smallest;
    }
  }

  function push(item: ScheduledItem<P>): void {
    heap.push(item);
    live.set(item.id, item);
    siftUp(heap.length - 1);
  }

  function removeTop(): ScheduledItem<P> | undefined {
    const top = heap[0];
    if (top === undefined) return undefined;
    const last = heap.pop() as ScheduledItem<P>;
    if (heap.length > 0) {
      heap[0] = last;
      siftDown(0);
    }
    return top;
  }

  /** Buang acara yang sudah dibatalkan dari puncak heap (penghapusan malas). */
  function dropCancelledOnTop(): void {
    for (;;) {
      const top = heap[0];
      if (top === undefined || live.get(top.id) === top) return;
      removeTop();
    }
  }

  function validate(item: ScheduledItem<P>): void {
    if (!Number.isSafeInteger(item.id) || item.id < 1) throw new RangeError(`ID acara tidak valid: ${String(item.id)}`);
    if (!Number.isSafeInteger(item.at)) throw new RangeError(`Waktu acara harus bilangan bulat: ${String(item.at)}`);
    if (!Number.isFinite(item.priority)) throw new RangeError(`Prioritas harus bilangan terhingga: ${String(item.priority)}`);
    if (item.type === '') throw new RangeError('Tipe acara tidak boleh kosong');
  }

  if (snapshot !== undefined) {
    let maxId = 0;
    for (const item of snapshot.items) {
      validate(item);
      if (live.has(item.id)) throw new RangeError(`ID acara ganda pada snapshot: ${item.id}`);
      if (item.id > maxId) maxId = item.id;
      push(item);
    }
    if (!Number.isSafeInteger(snapshot.nextId) || snapshot.nextId <= maxId) {
      throw new RangeError('nextId pada snapshot harus lebih besar dari semua ID acara');
    }
    nextId = snapshot.nextId;
  }

  return {
    schedule(input) {
      const item: ScheduledItem<P> = {
        id: nextId,
        at: input.at,
        priority: input.priority ?? 0,
        type: input.type,
        payload: input.payload,
      };
      validate(item);
      nextId += 1;
      push(item);
      return item;
    },
    cancel(id) {
      return live.delete(id);
    },
    peek() {
      dropCancelledOnTop();
      return heap[0];
    },
    pop() {
      dropCancelledOnTop();
      const top = removeTop();
      if (top !== undefined) live.delete(top.id);
      return top;
    },
    get size() {
      return live.size;
    },
    snapshot() {
      return { items: [...live.values()].sort(compare), nextId };
    },
  };
}
