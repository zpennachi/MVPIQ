import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--body-background)",
        foreground: "var(--text)",
        // MVP-IQ Official Brand Colors - Override default yellow with exact brand gold
        yellow: {
          50: '#FFFBF0',
          100: '#FFF7E1',
          200: '#FFEFB8',
          300: '#FFE085',
          400: '#ffd633', // Lighter gold
          500: '#ffc700', // Primary MVP-IQ Gold - exact brand color
          600: '#e6b300', // Darker Gold for hovers
          700: '#cc9f00',
          800: '#b38b00',
          900: '#997700',
          950: '#806300',
        },
        // MVP-IQ Specific color system
        'mvp-gold': {
          DEFAULT: '#ffc700',
          dark: '#e6b300',
          light: '#ffd633',
        },
        'mvp-border': '#272727',
        'mvp-text': '#d9d9d9',
        'mvp-cta-text': '#ffffff',
        // Gray scale matching MVP-IQ dark theme
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#272727', // MVP-IQ box borders
          900: '#111827',
          950: '#000000', // Pure black - MVP-IQ background
        },
        primary: {
          DEFAULT: '#ffc700', // MVP-IQ Gold
          dark: '#e6b300',
          light: '#ffd633',
        },
        silver: '#C0C0C0',
      },
      boxShadow: {
        'mvp': '0 4px 6px -1px rgba(255, 255, 255, 0.1), 0 2px 4px -1px rgba(255, 255, 255, 0.06)',
        'mvp-hover': '0 8px 16px -4px rgba(255, 199, 0, 0.2)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
};
export default config;
