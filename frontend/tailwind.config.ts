import type { Config } from 'tailwindcss';

function themeColor(name: string) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // "CRM Track Ops" design - viz DESIGN-crm-track-ops.md v kořeni repozitáře.
        // Hodnoty jsou CSS proměnné (viz globals.css), takže přepnutí tmavého/
        // světlého tématu (data-theme na <html>) automaticky přebarví veškeré
        // stávající `bg-slate-*` / `text-slate-*` / `bg-brand-*` třídy v appce,
        // aniž by bylo nutné procházet každou stránku zvlášť.
        brand: {
          50: themeColor('brand-50'),
          100: themeColor('brand-100'),
          500: themeColor('brand-500'),
          600: themeColor('brand-600'),
          700: themeColor('brand-700'),
        },
        slate: {
          50: themeColor('slate-50'),
          100: themeColor('slate-100'),
          200: themeColor('slate-200'),
          300: themeColor('slate-300'),
          400: themeColor('slate-400'),
          500: themeColor('slate-500'),
          600: themeColor('slate-600'),
          700: themeColor('slate-700'),
          800: themeColor('slate-800'),
          900: themeColor('slate-900'),
        },
        canvas: themeColor('canvas'),
        surface: {
          soft: themeColor('surface-soft'),
          card: themeColor('surface-card'),
          elevated: themeColor('surface-elevated'),
        },
        hairline: {
          DEFAULT: themeColor('hairline'),
          strong: themeColor('hairline-strong'),
        },
        ink: themeColor('ink'),
        muted: themeColor('muted'),
        accent: {
          blue: themeColor('accent-blue'),
          violet: themeColor('accent-violet'),
          rose: themeColor('accent-rose'),
        },
      },
    },
  },
  plugins: [],
};

export default config;
