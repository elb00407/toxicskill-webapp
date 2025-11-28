import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        vip: "var(--accent-vip)",
        std: "var(--accent-std)",
        ps: "var(--accent-ps)",
        success: "var(--success)",
        danger: "var(--danger)"
      }
    }
  },
  plugins: []
};
export default config;
