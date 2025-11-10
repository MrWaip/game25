/* eslint-disable @typescript-eslint/no-explicit-any */

type Listener<T> = (payload: T) => void;

type AllEventsListener<E extends Record<string, any>> = <K extends keyof E>(
  event: K,
  payload: E[K]
) => void;

export class EventBus<E extends Record<string, any>> {
  #listeners: Map<keyof E, Set<Listener<any>>>;
  #allListeners: Set<AllEventsListener<E>>;

  constructor() {
    this.#listeners = new Map();
    this.#allListeners = new Set();
  }

  public emit<K extends keyof E>(
    event: K,
    ...args: E[K] extends void ? [] : [E[K]]
  ) {
    const handlers = this.#listeners.get(event);

    if (handlers) {
      for (const handler of handlers) {
        handler(args[0]!);
      }
    }

    if (this.#allListeners.size > 0) {
      const payload = args[0]!;
      for (const listener of this.#allListeners) {
        listener(event, payload);
      }
    }
  }

  public on<K extends keyof E>(event: K, listener: Listener<E[K]>) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());

    this.#listeners.get(event)!.add(listener);
  }

  public onAll(listener: AllEventsListener<E>) {
    this.#allListeners.add(listener);
  }

  public offAll(listener: AllEventsListener<E>) {
    this.#allListeners.delete(listener);
  }

  public clear(): void {
    this.#listeners.clear();
    this.#allListeners.clear();
  }
}
