/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0B0F19',
          card: '#111827',
          cardHover: '#1F2937',
          border: '#374151',
          accent: '#06B6D4',
          accentHover: '#0891B2',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
          muted: '#9CA3AF'
        }
      }
    },
  },
  plugins: [],
}
