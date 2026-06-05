/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        sky: {
          start: '#0EA5E9',
          end: '#38BDF8',
        },
        gold: '#F59E0B',
        deep: '#1E3A5F',
        cloud: '#F8FAFC',
        rock: '#64748B',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'cloud': 'float-cloud 8s ease-in-out infinite',
        'cloud-slow': 'float-cloud 12s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
