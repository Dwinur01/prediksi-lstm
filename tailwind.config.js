/** @type {import('tailwindcss').Config} */
// Token desain: lihat DESIGN.md §2–§3. Warna memakai CSS variables (terang/gelap) di src/index.css.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        ink: token('ink'),
        muted: token('muted'),
        rule: token('rule'),
        brand: token('brand'),
        positive: token('positive'),
        caution: token('caution'),
        negative: token('negative'),
        // alias lama selama migrasi (jangan dipakai di kode baru)
        background: token('paper'),
        primary: token('brand'),
        accent: token('brand'),
        secondary: token('muted'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Newsreader Variable"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
