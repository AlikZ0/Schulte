/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "var(--bg)",
          soft: "var(--bg-soft)",
          card: "var(--bg-card)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          glow: "var(--accent-glow)",
          neon: "var(--accent-neon)",
          success: "var(--success)",
          danger: "var(--danger)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans, Inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 10px 40px -10px var(--shadow-soft, rgba(124, 92, 255, 0.35))",
        glow: "0 0 24px var(--shadow-glow, rgba(124, 92, 255, 0.55))",
        neon: "0 0 24px var(--shadow-neon, rgba(34, 211, 238, 0.45))",
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(1200px 600px at 50% -10%, var(--bg-grad-1), transparent 60%), radial-gradient(800px 500px at 100% 100%, var(--bg-grad-2), transparent 60%)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "scale-pop": "scalePop 0.25s ease-out both",
        "shake": "shake 0.4s ease-in-out both",
        "screen-shake": "screenShake 0.45s cubic-bezier(.36,.07,.19,.97) both",
        "pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
        "rise": "rise 0.5s cubic-bezier(.21,.93,.34,1) both",
        "screen-flash": "screenFlash 0.6s ease-out both",
        "tile-fade": "tileFade 4.1s ease-in 0.6s both",
        "tile-blink": "tileBlink 0.45s ease-in-out 1",
        "tile-jitter": "tileJitter 1.6s ease-in-out infinite",
        "tile-shimmer": "tileShimmer 1.8s ease-in-out infinite",
        "ripple": "ripple 0.55s ease-out both",
        "confetti": "confettiFall 1.2s cubic-bezier(.25,1,.5,1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scalePop: {
          "0%": { transform: "scale(0.92)" },
          "60%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        screenShake: {
          "0%,100%": { transform: "translate(0,0)" },
          "20%": { transform: "translate(-3px, 2px)" },
          "40%": { transform: "translate(4px, -2px)" },
          "60%": { transform: "translate(-2px, 3px)" },
          "80%": { transform: "translate(3px, -1px)" },
        },
        pulseSoft: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(124,92,255,0.45)" },
          "50%": { boxShadow: "0 0 0 14px rgba(124,92,255,0)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        screenFlash: {
          "0%": { opacity: "0" },
          "20%": { opacity: "0.55" },
          "100%": { opacity: "0" },
        },
        tileFade: {
          "0%, 14%": { opacity: "1" },
          /* Floors at 0.55 so numbers stay readable even when FADE is on. */
          "100%": { opacity: "0.55" },
        },
        tileBlink: {
          "0%, 100%": { filter: "brightness(1)" },
          "50%": { filter: "brightness(0.45)" },
        },
        tileJitter: {
          "0%,100%": { transform: "translate(0,0)" },
          "25%": { transform: "translate(2px, -1px)" },
          "50%": { transform: "translate(-2px, 1px)" },
          "75%": { transform: "translate(1px, 2px)" },
        },
        tileShimmer: {
          "0%,100%": { filter: "brightness(1.05)", letterSpacing: "0em" },
          "50%": { filter: "brightness(1.55)", letterSpacing: "0.04em" },
        },
        ripple: {
          "0%": { transform: "scale(0.4)", opacity: "0.45" },
          "100%": { transform: "scale(2.1)", opacity: "0" },
        },
        confettiFall: {
          "0%": { transform: "translate(0, -10px) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translate(var(--cx, 0px), 100vh) rotate(720deg)",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
};
