import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./styles/**/*.{ts,tsx,css}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#111111",
          accent: "#FFFFFF"
        },
        // 主题 CSS 变量
        app: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        foreground: 'var(--color-foreground)',
        'muted-foreground': 'var(--color-muted-foreground)',
        default: 'var(--color-border)',
        primary: 'var(--color-primary)',
        'primary-foreground': 'var(--color-primary-foreground)',
        link: 'var(--color-link)',
        'nav-bg': 'var(--color-nav-bg)',
        scrim: 'var(--color-scrim)',
        'on-accent': 'var(--color-on-accent)'
      },
      borderColor: {
        default: 'var(--color-border)'
      },
      fontFamily: {
        sans: ["'Helvetica Neue'", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class"
    })
  ]
};

export default config;
