import { useEffect, useState } from "react";
import { useSettings } from "../store/SettingsContext";

interface BeforeInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * Floating install button that appears once the browser fires the
 * `beforeinstallprompt` event. Hides automatically after the user installs
 * or dismisses, and respects standalone mode.
 */
export function InstallPrompt() {
  const { t } = useSettings();
  const [evt, setEvt] = useState<BeforeInstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!evt || dismissed) return null;

  const isStandalone =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-2xl glass shadow-glow animate-rise"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
    >
      <button
        type="button"
        onClick={async () => {
          await evt.prompt();
          await evt.userChoice;
          setEvt(null);
        }}
        className="btn-primary px-4 py-2"
      >
        ⬇ {t("common.install")}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="px-2 text-white/55 hover:text-white"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
