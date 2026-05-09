import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useLocalStorage - persist a piece of React state in window.localStorage.
 * Falls back to the initial value when storage is not available (SSR / disabled).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [stored, setStored] = useState<T>(readValue);
  const isFirst = useRef(true);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next =
          typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore storage errors */
        }
        return next;
      });
    },
    [key]
  );

  // Sync across tabs.
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        setStored(e.newValue === null ? initialValue : (JSON.parse(e.newValue) as T));
      } catch {
        /* ignore parsing errors */
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key, initialValue]);

  return [stored, setValue];
}
