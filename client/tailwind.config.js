/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0d',
        fg: '#f2f2f2',
        muted: '#a1a1a1',
        platinum: '#E5E4E2',
        silver: '#C0C0C0',
        darksilver: '#8e8e8e'
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial']
      },
      boxShadow: {
        glass: '0 8px 28px rgba(0,0,0,.25)'
      }
    }
  },
  plugins: []
}
