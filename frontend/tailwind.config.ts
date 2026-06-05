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
        surface: '#111827',
        elevated: '#1a2535',
        border: '#1f2937',
        'border-active': '#2d3748',
        amber: '#f59e0b',
        'amber-dim': '#7a5a1a',
        'amber-glow': 'rgba(245,158,11,0.12)',
        crimson: '#ef4444',
        'crimson-dim': 'rgba(239,68,68,0.1)',
        orange: '#f97316',
        'orange-dim': 'rgba(249,115,22,0.1)',
        emerald: '#10b981',
        'emerald-dim': 'rgba(16,185,129,0.1)',
        primary: '#f9fafb',
        secondary: '#9ca3af',
        muted: '#6b7280',
        blue: '#3b82f6',
        cyan: '#06b6d4',
        'cyan-dim': 'rgba(6,182,212,0.1)',
        violet: '#8b5cf6',
        'violet-dim': 'rgba(139,92,246,0.1)',
        rose: '#fb7185',
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
          '0%,100%': { boxShadow: '0 0 8px rgba(245,158,11,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(245,158,11,0.8)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
