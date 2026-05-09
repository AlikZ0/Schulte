import { useEffect, useState } from "react";

export interface Viewport {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  /** Devices flagged as low-power (rough heuristic; used to throttle effects). */
  isLowEnd: boolean;
  isStandalone: boolean;
}

const MOBILE_BREAK = 640;
const TABLET_BREAK = 1024;

function detect(): Viewport {
  if (typeof window === "undefined") {
    return {
      width: 1024,
      height: 768,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isPortrait: false,
      isLowEnd: false,
      isStandalone: false,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;

  const cores =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4
      : 4;
  const memory =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
      : 4;

  const isStandalone =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);

  return {
    width: w,
    height: h,
    isMobile: w < MOBILE_BREAK,
    isTablet: w >= MOBILE_BREAK && w < TABLET_BREAK,
    isDesktop: w >= TABLET_BREAK,
    isPortrait: h > w,
    isLowEnd: cores <= 4 && memory <= 4,
    isStandalone,
  };
}

export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(() => detect());

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp(detect()));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return vp;
}
