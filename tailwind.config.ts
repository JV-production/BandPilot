import type { Config } from "tailwindcss";

// Barvy jsou definované jako CSS proměnné v globals.css (světlý i tmavý režim).
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        line: token("line"),
        ink: token("ink"),
        "ink-2": token("ink-2"),
        "ink-3": token("ink-3"),
        brand: token("brand"),
        "brand-2": token("brand-2"),
        "brand-soft": token("brand-soft"),
        ok: token("ok"),
        "ok-soft": token("ok-soft"),
        warn: token("warn"),
        "warn-soft": token("warn-soft"),
        bad: token("bad"),
        "bad-soft": token("bad-soft"),
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          "Inter",
          '"Segoe UI"',
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 16 40 / 0.04), 0 10px 30px -14px rgb(15 16 40 / 0.18)",
        glow: "0 10px 30px -10px rgb(var(--brand) / 0.55)",
      },
    },
  },
  plugins: [],
} satisfies Config;
