import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        bg: '#0a0d14',
        surface: '#0d1929',
        elevated: '#122238',
        border: '#1c2d42',
        'border-active': '#264563',
        amber: '#60a5fa',
        'amber-dim': 'rgba(96,165,250,0.15)',
        'amber-glow': 'rgba(96,165,250,0.1)',
        crimson: '#f87171',
        'crimson-dim': 'rgba(248,113,113,0.08)',
        orange: '#7dd3fc',
        'orange-dim': 'rgba(125,211,252,0.08)',
        emerald: '#38bdf8',
        'emerald-dim': 'rgba(56,189,248,0.08)',
        primary: '#edf2ff',
        secondary: '#8ba4be',
        muted: '#607a96',
        blue: '#60a5fa',
        cyan: '#60a5fa',
        'cyan-dim': 'rgba(96,165,250,0.08)',
        violet: '#93c5fd',
        'violet-dim': 'rgba(147,197,253,0.08)',
        rose: '#94a3b8',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        blink: 'blink 1.2s step-end infinite',
        'scan-line': 'scanLine 2.5s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        glow: 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        scanLine: {
          '0%': { top: '0%', opacity: '0' },
          '5%': { opacity: '1' },
          '95%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 8px rgba(96,165,250,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(96,165,250,0.8)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
