import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-sm glass rounded-3xl p-6 shadow-soft animate-rise text-center">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-white/60">{description}</p>
        )}
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={[
              "btn flex-1 font-semibold text-white shadow-soft hover:-translate-y-0.5 hover:shadow-glow",
              destructive
                ? "bg-gradient-to-br from-rose-500 to-pink-600"
                : "bg-gradient-to-br from-accent to-accent-glow",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
