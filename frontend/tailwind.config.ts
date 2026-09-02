import type { Config } from 'tailwindcss';

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
        // Přebarvení `brand` na sytou modrou (jedinou akční barvu appky) a
        // přepsání `slate` na tmavý stupňovaný škál znamená, že se veškeré
        // stávající `bg-slate-*` / `text-slate-*` / `bg-brand-*` třídy v appce
        // automaticky přebarví, aniž by bylo nutné procházet každou stránku zvlášť.
        brand: {
          50: '#101c2b',
          100: '#132236',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        slate: {
          50: '#0a0a0b',
          100: '#111214',
          200: '#2a2c30',
          300: '#35373c',
          400: '#6b7280',
          500: '#8b8f98',
          600: '#b7bac1',
          700: '#d1d3d8',
          800: '#e5e7eb',
          900: '#f5f5f6',
        },
        canvas: '#0a0a0b',
        surface: {
          soft: '#111214',
          card: '#17181c',
          elevated: '#202226',
        },
        hairline: {
          DEFAULT: '#2a2c30',
          strong: '#35373c',
        },
        ink: '#ffffff',
        muted: '#6b7280',
        accent: {
          blue: '#2563eb',
          violet: '#7c3aed',
          rose: '#f43f5e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
