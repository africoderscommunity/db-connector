/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // adjust if needed
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        accent: '#F59E0B',
        darkBg: '#0F172A',
        lightBg: '#F8FAFC',
        textLight: '#E2E8F0',
        textMuted: '#94A3B8',
      },
    },
  },
  plugins: [],
};
