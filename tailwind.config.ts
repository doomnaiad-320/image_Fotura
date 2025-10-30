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
        // 主题 CSS 变量（保留现有）
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
        'on-accent': 'var(--color-on-accent)',
        // 新增 shadcn 风格语义色，方便使用 bg-background / text-foreground 等
        background: 'hsl(var(--background))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))'
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
