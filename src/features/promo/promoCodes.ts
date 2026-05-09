import type { ProgressData } from "../../types";
import { TOTAL_LEVELS } from "../../utils/levels";

/**
 * Promo code definition. Each code carries a pure `apply` function that
 * returns a partial patch to fold into ProgressData.
 *
 * Codes are case-insensitive and one-shot per device (tracked via
 * `progress.redeemedCodes`).
 */
export interface PromoCode {
  id: string;          // canonical lowercase id
  /** Human-readable, used in toasts. */
  label: string;
  /** Returns a patch to merge into ProgressData when redeemed. */
  apply: (prev: ProgressData) => Partial<ProgressData>;
  /** Short description shown after redemption. */
  rewardSummary: string;
}

export const PROMO_CODES: PromoCode[] = [
  {
    id: "alik",
    label: "ALIK",
    rewardSummary: "All 100 levels unlocked · +1000 XP · +5 skill points",
    apply: (prev) => ({
      highestUnlockedLevel: TOTAL_LEVELS,
      xp: prev.xp + 1000,
      skillPoints: prev.skillPoints + 5,
    }),
  },
];

export type RedeemResult =
  | { ok: true; code: PromoCode }
  | { ok: false; reason: "unknown" | "already_redeemed" };

/**
 * Looks up a code by case-insensitive id and reports if it is valid /
 * already-claimed without mutating anything.
 */
export function lookupPromoCode(input: string, redeemed: string[]): RedeemResult {
  const id = input.trim().toLowerCase();
  if (!id) return { ok: false, reason: "unknown" };
  const code = PROMO_CODES.find((c) => c.id === id);
  if (!code) return { ok: false, reason: "unknown" };
  if (redeemed.includes(code.id)) return { ok: false, reason: "already_redeemed" };
  return { ok: true, code };
}
