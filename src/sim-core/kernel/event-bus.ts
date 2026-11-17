/** Pub/sub sinkron dan berurutan untuk event domain. */

export interface BusEvent {
  readonly type: string;
}

export type EventFilter<E> = (event: E) => boolean;
export type Unsubscribe = () => void;

export interface EventBus<E extends BusEvent> {
  subscribe(handler: (event: E) => void, filter?: EventFilter<E>): Unsubscribe;
  publish(event: E): void;
}

export interface EventBusOptions<E> {
  /**
   * Dipanggil untuk setiap error dari handler. Jika tidak diberikan, semua handler tetap menerima
   * event lalu error dilempar sebagai AggregateError setelah pengiriman selesai.
   */
  readonly onHandlerError?: (error: unknown, event: E) => void;
}

interface Entry<E> {
  readonly handler: (event: E) => void;
  readonly filter: EventFilter<E> | undefined;
  active: boolean;
}

export function createEventBus<E extends BusEvent>(options: EventBusOptions<E> = {}): EventBus<E> {
  let entries: Entry<E>[] = [];
  return {
    subscribe(handler, filter) {
      const entry: Entry<E> = { handler, filter, active: true };
      entries = [...entries, entry];
      return () => {
        entry.active = false;
        entries = entries.filter((e) => e !== entry);
      };
    },
    publish(event) {
      const errors: unknown[] = [];
      for (const entry of entries) {
        if (!entry.active) continue;
        try {
          if (entry.filter !== undefined && !entry.filter(event)) continue;
          entry.handler(event);
        } catch (error) {
          if (options.onHandlerError !== undefined) options.onHandlerError(error, event);
          else errors.push(error);
        }
      }
      if (errors.length > 0) throw new AggregateError(errors, `${errors.length} handler event gagal`);
    },
  };
}
