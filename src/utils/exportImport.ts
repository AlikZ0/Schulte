/**
 * User-facing export / import of save data. Used for manual cloud sync and
 * device migration. The payload is encrypted by persistence.exportSnapshot.
 */
import { exportSnapshot, parseSnapshot } from "./persistence";

const SCHEMA = 1;

export interface SnapshotInput {
  settings: unknown;
  progress: unknown;
}

export function buildExportText(values: SnapshotInput): string {
  return exportSnapshot({ settings: values.settings, progress: values.progress }, SCHEMA);
}

export function readImportText(text: string): SnapshotInput | null {
  const snap = parseSnapshot(text.trim());
  if (!snap) return null;
  const v = snap.values as { settings?: unknown; progress?: unknown };
  return {
    settings: v.settings ?? null,
    progress: v.progress ?? null,
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function downloadAsFile(text: string, filename = "schulte-progress.txt"): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
