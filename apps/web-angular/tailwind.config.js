/** @type {import('tailwindcss').Config} */
// Same theme as apps/web/tailwind.config.ts — keep the two in step so both
// frontends render identically.
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0D2240',
          mid: '#1a3a6b',
          light: '#e8edf5',
        },
        gold: {
          DEFAULT: '#C8973A',
          light: '#f5edd8',
        },
        white: '#ffffff',
        'off-white': '#f7f8fa',
        border: '#dde3ef',
        text: {
          DEFAULT: '#1a2540',
          mid: '#4a5578',
          muted: '#8892aa',
        },
        success: '#1a7a4a',
        danger: '#c0392b',
      },
      borderRadius: {
        theme: '10px',
      },
      boxShadow: {
        theme: '0 2px 16px rgba(13,34,64,.09)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)'],
        serif: ['var(--font-playfair-display)'],
      },
    },
  },
  plugins: [],
};
