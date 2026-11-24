// phoenix-event-display imports EventEmitter from @angular/core without declaring the dependency.
// Only emit() and subscribe() are used, so this minimal stand-in avoids pulling Angular in.
type Listener<T> = (value: T) => void;

export class EventEmitter<T = unknown> {
  private listeners = new Set<Listener<T>>();

  emit(value: T): void {
    for (const listener of this.listeners) listener(value);
  }

  subscribe(listener: Listener<T>): { unsubscribe(): void } {
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }
}
