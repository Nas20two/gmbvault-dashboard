/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // GMBVault brand palette (dark-first)
        vault: {
          bg: '#262626',
          card: '#404040',
          muted: '#a3a3a3',
          text: '#e5e5e5',
          accent: '#f59e0b',
          success: '#10b981',
        },
        // Status pipeline colors (kept; white text on badges)
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
