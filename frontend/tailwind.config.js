/** @type {import('tailwindcss').Config} */
const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: channel('--paper'),
        surface: channel('--surface'),
        raised: channel('--raised'),
        ink: {
          DEFAULT: channel('--ink'),
          2: channel('--ink-2'),
        },
        muted: channel('--muted'),
        line: {
          DEFAULT: channel('--line'),
          2: channel('--line-2'),
        },
        bubble: channel('--bubble'),
        accent: {
          DEFAULT: channel('--accent'),
          strong: channel('--accent-strong'),
          text: channel('--accent-text'),
          deep: channel('--accent-deep'),
          soft: channel('--accent-soft'),
        },
        'on-accent': channel('--on-accent'),
        danger: channel('--danger'),
        'danger-soft': channel('--danger-soft'),
        ok: channel('--ok'),
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        composer: '0 1px 2px rgb(11 13 18 / 0.05), 0 8px 24px -18px rgb(11 13 18 / 0.25)',
        pop: '0 18px 40px -20px rgb(11 13 18 / 0.35)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 0.84, 0.44, 1)',
      },
    },
  },
  plugins: [],
};
