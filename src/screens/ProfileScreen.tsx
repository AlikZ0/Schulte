import { useState } from "react";
import { useProgress } from "../store/ProgressContext";
import { useSettings } from "../store/SettingsContext";
import { AVATAR_OPTIONS, gradientById, initialsFor } from "../features/profile/avatars";
import { SKILLS } from "../features/skills/skillsConfig";
import type { SkillRanks } from "../types";
import type { TranslationKey } from "../i18n";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TOTAL_LEVELS } from "../utils/levels";
import { rankFor } from "../utils/ranks";
import { XpBar } from "../components/XpBar";

export function ProfileScreen() {
  const { progress, updateProfile, allocateSkill, resetSkills, prestige, claimDailyLogin } =
    useProgress();
  const { t } = useSettings();
  const [editingName, setEditingName] = useState(progress.profile.name);
  const [confirmPrestige, setConfirmPrestige] = useState(false);
  const [confirmRespec, setConfirmRespec] = useState(false);
  const [loginReward, setLoginReward] = useState<number | null>(null);

  const since = new Date(progress.profile.createdAt);
  const sinceLabel = since.toLocaleDateString();

  const { rank } = rankFor(progress.xp);

  const onSaveName = () => {
    if (editingName.trim() !== progress.profile.name) {
      updateProfile({ name: editingName.trim() });
    }
  };

  const onClaim = () => {
    const r = claimDailyLogin();
    if (r > 0) setLoginReward(r);
  };

  const canPrestige = progress.highestUnlockedLevel >= TOTAL_LEVELS;

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-5 has-bottom-nav animate-fade-in">
      <header className="flex items-center gap-4">
        <div
          className={[
            "h-16 w-16 rounded-2xl shadow-glow grid place-items-center text-bg font-extrabold text-2xl",
            "bg-gradient-to-br",
            gradientById(progress.profile.avatarColor),
          ].join(" ")}
          aria-hidden
        >
          {initialsFor(progress.profile.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {progress.profile.name}
          </h1>
          <p className="text-xs text-white/55">
            {t(rank.nameKey as TranslationKey)} ·{" "}
            {t("profile.member_since")} {sinceLabel}
          </p>
          <div className="mt-2"><XpBar xp={progress.xp} showLabels /></div>
        </div>
      </header>

      <section className="glass rounded-3xl p-5 flex flex-col gap-3">
        <label className="text-sm font-semibold text-white/85">{t("profile.name")}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            placeholder={t("profile.name_placeholder")}
            maxLength={24}
            className="flex-1 glass rounded-2xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-accent-glow"
          />
          <button onClick={onSaveName} className="btn-primary">
            {t("common.save")}
          </button>
        </div>

        <label className="text-sm font-semibold text-white/85 mt-2">
          {t("profile.avatar")}
        </label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_OPTIONS.map((a) => {
            const active = progress.profile.avatarColor === a.id;
            return (
              <button
                key={a.id}
                aria-label={a.id}
                onClick={() => updateProfile({ avatarColor: a.id })}
                className={[
                  "h-10 w-10 rounded-xl bg-gradient-to-br",
                  a.gradient,
                  active ? "ring-2 ring-white shadow-glow" : "ring-1 ring-white/10",
                ].join(" ")}
              />
            );
          })}
        </div>
      </section>

      {/* Daily login */}
      <section className="glass rounded-3xl p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-bg font-bold shadow-soft">
          🎁
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{t("login.title")}</div>
          <div className="text-xs text-white/55">
            {t("login.subtitle")} · {t("login.streak")}{" "}
            <span className="font-mono text-white/85">{progress.login.streak}</span>
          </div>
        </div>
        {progress.login.claimedToday ? (
          <span className="chip text-accent-success">{t("login.claimed")}</span>
        ) : (
          <button onClick={onClaim} className="btn-primary">
            {t("login.claim")}
          </button>
        )}
      </section>

      {loginReward != null && (
        <div className="text-center text-sm text-accent-neon font-semibold animate-fade-in">
          +{loginReward} XP
        </div>
      )}

      {/* Skill tree */}
      <section className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-white/85">{t("profile.skills")}</div>
            <div className="text-xs text-white/55">
              {t("profile.skill_points")}:{" "}
              <span className="text-white/90 font-bold tabular-nums">
                {progress.skillPoints}
              </span>
            </div>
          </div>
          <button onClick={() => setConfirmRespec(true)} className="btn-ghost text-xs">
            {t("skill.respec")}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {SKILLS.map((s) => {
            const rank = progress.skills[s.id as keyof SkillRanks];
            const canAlloc = progress.skillPoints > 0 && rank < s.maxRank;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/5 grid place-items-center text-xl">
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {t(s.nameKey as TranslationKey)}
                    <span className="text-xs text-white/45 tabular-nums">
                      {rank}/{s.maxRank}
                    </span>
                  </div>
                  <div className="text-xs text-white/55 truncate">
                    {t(s.descriptionKey as TranslationKey)}
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-neon transition-all duration-300"
                      style={{ width: `${(rank / s.maxRank) * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canAlloc}
                  onClick={() => allocateSkill(s.id as keyof SkillRanks)}
                  className="btn-primary px-3 py-2"
                  aria-label={t("skill.allocate")}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Prestige */}
      <section className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white/85">{t("profile.prestige")}</div>
            <div className="text-xs text-white/55 mt-1 max-w-md">
              {t("profile.prestige_desc")}
            </div>
            <div className="text-xs text-white/45 mt-2">
              {t("profile.prestige_count")}:{" "}
              <span className="text-white/85 font-bold tabular-nums">
                {progress.prestige.prestiges}
              </span>{" "}
              · ×{progress.prestige.xpMultiplier.toFixed(2)} XP
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmPrestige(true)}
            disabled={!canPrestige}
            className={[
              "btn font-semibold text-white shadow-soft hover:-translate-y-0.5 hover:shadow-glow",
              canPrestige
                ? "bg-gradient-to-br from-amber-400 to-rose-500"
                : "bg-white/10",
            ].join(" ")}
          >
            ★ {t("profile.prestige_button")}
          </button>
        </div>
        {!canPrestige && (
          <div className="mt-2 text-xs text-white/45">{t("profile.prestige_locked")}</div>
        )}
      </section>

      <ConfirmDialog
        open={confirmPrestige}
        title={t("profile.prestige_button")}
        description={t("profile.prestige_warning")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        destructive
        onCancel={() => setConfirmPrestige(false)}
        onConfirm={() => {
          setConfirmPrestige(false);
          prestige();
        }}
      />
      <ConfirmDialog
        open={confirmRespec}
        title={t("skill.respec")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirmRespec(false)}
        onConfirm={() => {
          setConfirmRespec(false);
          resetSkills();
        }}
      />
    </main>
  );
}
