import { useEffect, useState } from "react";
import { applyUpdate, onUpdateReady } from "../features/pwa/registerSW";
import { useSettings } from "../store/SettingsContext";

export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const { t } = useSettings();

  useEffect(() => onUpdateReady(() => setReady(true)), []);
  if (!ready) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 glass rounded-2xl px-3 py-2 flex items-center gap-2 shadow-glow animate-rise"
      style={{ bottom: "calc(var(--bottom-nav-height, 88px) + 16px)" }}
      role="status"
    >
      <span className="text-sm text-white/85">{t("common.update_available")}</span>
      <button onClick={applyUpdate} className="btn-primary px-3 py-1 text-xs">
        {t("common.update_apply")}
      </button>
    </div>
  );
}
