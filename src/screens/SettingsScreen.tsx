import { useState } from "react";
import { useSettings } from "../store/SettingsContext";
import { useProgress } from "../store/ProgressContext";
import { LANGUAGE_OPTIONS } from "../i18n";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { ColorblindMode, Language, TextScale, ThemeId } from "../types";
import { THEME_LIST, isThemeUnlocked } from "../features/themes/themesConfig";
import { COLORBLIND_LABELS, TEXT_SCALE_LABELS } from "../features/themes/accessibility";
import {
  buildExportText,
  copyToClipboard,
  downloadAsFile,
  readImportText,
} from "../utils/exportImport";

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-xs text-white/55 mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
          value ? "bg-gradient-to-r from-accent to-accent-glow" : "bg-white/10",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-soft transition-transform",
            value ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

export function SettingsScreen() {
  const { settings, setSettings, replaceSettings, t } = useSettings();
  const { progress, resetProgress, setProgress, redeemPromoCode } = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const [exportText, setExportText] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] =
    useState<{ ok: boolean; text: string } | null>(null);

  const handlePromoRedeem = () => {
    const result = redeemPromoCode(promoInput);
    if (result.ok) {
      setPromoMessage({
        ok: true,
        text: `${t("promo.success")} ${result.code.rewardSummary}`,
      });
      setPromoInput("");
    } else if (result.reason === "already_redeemed") {
      setPromoMessage({ ok: false, text: t("promo.already") });
    } else {
      setPromoMessage({ ok: false, text: t("promo.unknown") });
    }
  };

  const handleExport = () => {
    setExportText(buildExportText({ settings, progress }));
  };

  const handleCopy = async () => {
    if (!exportText) return;
    const ok = await copyToClipboard(exportText);
    if (ok) setImportMessage({ ok: true, text: t("common.copied") });
  };

  const handleDownload = () => {
    if (!exportText) return;
    downloadAsFile(exportText);
  };

  const handleImport = () => {
    const parsed = readImportText(importText);
    if (!parsed) {
      setImportMessage({ ok: false, text: t("settings.import_failed") });
      return;
    }
    if (parsed.settings) replaceSettings(parsed.settings as never);
    if (parsed.progress) setProgress(parsed.progress as never);
    setImportMessage({ ok: true, text: t("settings.import_success") });
  };

  return (
    <main className="w-full max-w-3xl mx-auto px-4 pb-6 sm:pb-8 flex flex-col gap-5 has-bottom-nav has-top-safe animate-fade-in">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t("settings.title")}
        </h1>
      </header>

      <section className="glass rounded-3xl px-4 sm:px-5 divide-y divide-white/5">
        <ToggleRow label={t("settings.sound")}      value={settings.sound}      onChange={(v) => setSettings({ sound: v })} />
        <ToggleRow label={t("settings.music")}      value={settings.music}      onChange={(v) => setSettings({ music: v })} />
        <ToggleRow label={t("settings.animations")} value={settings.animations} onChange={(v) => setSettings({ animations: v })} />
        <ToggleRow label={t("settings.haptics")}    value={settings.haptics}    onChange={(v) => setSettings({ haptics: v })} />
        <ToggleRow
          label={t("settings.assist")}
          description={t("settings.assist_help")}
          value={settings.difficultyAssist}
          onChange={(v) => setSettings({ difficultyAssist: v })}
        />
      </section>

      {/* Theme */}
      <section className="glass rounded-3xl p-5">
        <div className="text-sm font-semibold text-white/80 mb-3">{t("settings.theme")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {THEME_LIST.map((th) => {
            const unlocked = isThemeUnlocked(
              th.id,
              progress.highestUnlockedLevel,
              progress.prestige.prestiges,
            );
            const active = settings.theme === th.id;
            return (
              <button
                key={th.id}
                type="button"
                disabled={!unlocked}
                onClick={() => setSettings({ theme: th.id as ThemeId })}
                className={[
                  "rounded-2xl p-3 flex flex-col items-center gap-2 transition-all",
                  unlocked ? "glass hover:-translate-y-0.5" : "bg-white/[0.025] cursor-not-allowed opacity-55",
                  active ? "ring-2 ring-accent shadow-glow" : "",
                ].join(" ")}
              >
                <div
                  className="h-10 w-10 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${th.vars["--accent"]}, ${th.vars["--accent-neon"]})`,
                  }}
                />
                <div className="text-xs font-semibold">
                  {t(th.nameKey as never)}
                </div>
                {!unlocked && (
                  <div className="text-[10px] text-white/45">
                    Lvl {th.unlockLevel}
                    {th.unlockPrestige > 0 ? ` · ★${th.unlockPrestige}` : ""}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Accessibility */}
      <section className="glass rounded-3xl p-5">
        <div className="text-sm font-semibold text-white/80 mb-3">{t("settings.accessibility")}</div>

        <label className="text-xs text-white/55">{t("settings.colorblind")}</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(COLORBLIND_LABELS) as ColorblindMode[]).map((m) => {
            const active = settings.colorblind === m;
            return (
              <button
                key={m}
                onClick={() => setSettings({ colorblind: m })}
                className={[
                  "h-9 px-3 rounded-2xl text-xs font-semibold transition-all",
                  active ? "bg-gradient-to-br from-accent to-accent-glow text-white" : "glass text-white/75",
                ].join(" ")}
              >
                {COLORBLIND_LABELS[m]}
              </button>
            );
          })}
        </div>

        <label className="block text-xs text-white/55 mt-4">{t("settings.text_scale")}</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(TEXT_SCALE_LABELS) as TextScale[]).map((s) => {
            const active = settings.textScale === s;
            return (
              <button
                key={s}
                onClick={() => setSettings({ textScale: s })}
                className={[
                  "h-9 px-3 rounded-2xl text-xs font-semibold transition-all",
                  active ? "bg-gradient-to-br from-accent to-accent-glow text-white" : "glass text-white/75",
                ].join(" ")}
              >
                {TEXT_SCALE_LABELS[s]}
              </button>
            );
          })}
        </div>

        <div className="mt-3 divide-y divide-white/5">
          <ToggleRow label={t("settings.dyslexia")}    value={settings.dyslexiaFont} onChange={(v) => setSettings({ dyslexiaFont: v })} />
          <ToggleRow label={t("settings.contrast")}    value={settings.highContrast} onChange={(v) => setSettings({ highContrast: v })} />
          <ToggleRow label={t("settings.left_handed")} value={settings.leftHanded}   onChange={(v) => setSettings({ leftHanded: v })} />
        </div>
      </section>

      {/* Language */}
      <section className="glass rounded-3xl p-5">
        <div className="text-sm font-semibold text-white/80 mb-3">{t("settings.language")}</div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = settings.language === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSettings({ language: opt.value as Language })}
                className={[
                  "btn h-10 px-4 rounded-2xl",
                  active
                    ? "bg-gradient-to-br from-accent to-accent-glow text-white shadow-soft"
                    : "glass text-white/80 hover:bg-white/[0.06]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-white/45 px-1">{t("settings.persistence")}</p>

      {/* Promo code */}
      <section className="glass rounded-3xl p-5">
        <div className="text-sm font-semibold text-white/80 mb-1">
          {t("promo.title")}
        </div>
        <div className="text-xs text-white/55 mb-3">{t("promo.subtitle")}</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePromoRedeem();
            }}
            placeholder={t("promo.placeholder")}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 glass rounded-2xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-accent-glow uppercase tracking-wider"
          />
          <button
            type="button"
            onClick={handlePromoRedeem}
            disabled={promoInput.trim().length === 0}
            className="btn-primary"
          >
            {t("promo.redeem")}
          </button>
        </div>
        {promoMessage && (
          <div
            className={[
              "mt-3 text-xs",
              promoMessage.ok ? "text-accent-success" : "text-accent-danger",
            ].join(" ")}
          >
            {promoMessage.text}
          </div>
        )}
      </section>

      {/* Backup */}
      <section className="glass rounded-3xl p-5">
        <div className="text-sm font-semibold text-white/80 mb-2">{t("settings.backup")}</div>

        <div className="text-xs text-white/55">{t("settings.export_help")}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={handleExport} className="btn-ghost">{t("settings.export")}</button>
          {exportText && (
            <>
              <button onClick={handleCopy} className="btn-ghost">{t("common.copy")}</button>
              <button onClick={handleDownload} className="btn-ghost">{t("common.download")}</button>
            </>
          )}
        </div>
        {exportText && (
          <textarea
            readOnly
            value={exportText}
            rows={3}
            className="mt-3 w-full rounded-xl bg-black/40 border border-white/10 p-2 font-mono text-[11px] text-white/85 select-all"
          />
        )}

        <div className="mt-5 text-xs text-white/55">{t("settings.import_help")}</div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={3}
          placeholder="EX1$…"
          className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 p-2 font-mono text-[11px] text-white/85"
        />
        <div className="mt-2 flex items-center gap-2">
          <button onClick={handleImport} className="btn-primary">
            {t("common.import")}
          </button>
          {importMessage && (
            <span
              className={[
                "text-xs",
                importMessage.ok ? "text-accent-success" : "text-accent-danger",
              ].join(" ")}
            >
              {importMessage.text}
            </span>
          )}
        </div>
        <p className="mt-3 text-[11px] text-white/40">{t("settings.account_help")}</p>
      </section>

      <section className="glass rounded-3xl p-5 border border-rose-500/15">
        <div className="text-sm font-semibold text-rose-300 mb-2">
          {t("settings.danger_zone")}
        </div>
        <button
          type="button"
          className="btn bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-soft hover:-translate-y-0.5 hover:shadow-glow"
          onClick={() => setConfirmReset(true)}
        >
          {t("common.reset_progress")}
        </button>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title={t("common.reset_progress")}
        description={t("common.reset_warning")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetProgress();
        }}
      />
    </main>
  );
}
