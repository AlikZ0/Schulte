import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  icon?: string;
  /** auto-dismiss delay in ms */
  ttl?: number;
}

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = nextId++;
      const ttl = toast.ttl ?? 4200;
      setToasts((list) => [...list, { ...toast, id }]);
      const timer = window.setTimeout(() => dismiss(id), ttl);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
  }, []);

  return { toasts, push, dismiss };
}
