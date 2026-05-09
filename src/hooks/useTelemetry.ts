import { useCallback, useRef } from "react";

export interface TelemetryEvent {
  name: string;
  ts: number;
  data?: Record<string, string | number | boolean | null>;
}

export interface TelemetryAdapter {
  track(event: TelemetryEvent): void;
}

/**
 * Default in-memory adapter — keeps the last N events for inspection.
 * Replace at app boot via setTelemetryAdapter() to wire an analytics provider.
 */
class InMemoryAdapter implements TelemetryAdapter {
  private buffer: TelemetryEvent[] = [];
  track(event: TelemetryEvent) {
    this.buffer.push(event);
    if (this.buffer.length > 200) this.buffer.shift();
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[telemetry] ${event.name}`, event.data ?? {});
    }
  }
  recent(): TelemetryEvent[] {
    return this.buffer.slice();
  }
}

let adapter: TelemetryAdapter = new InMemoryAdapter();

export function setTelemetryAdapter(next: TelemetryAdapter): void {
  adapter = next;
}

export function getTelemetryAdapter(): TelemetryAdapter {
  return adapter;
}

export function useTelemetry() {
  const ref = useRef(adapter);
  ref.current = adapter;
  return useCallback(
    (name: string, data?: TelemetryEvent["data"]) => {
      ref.current.track({ name, ts: Date.now(), data });
    },
    [],
  );
}
