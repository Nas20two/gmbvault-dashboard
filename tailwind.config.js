/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        drafted: '#6B7280',
        sent: '#3B82F6',
        followup_1: '#F59E0B',
        followup_2: '#F97316',
        replied: '#22C55E',
        converted: '#8B5CF6',
      },
    },
  },
  plugins: [],
};
