/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Baby Blue palette — anchor: #89CFF0
        primary: {
          50:  '#f0f9ff',
          100: '#dff2fd',
          200: '#b8e6fa',
          300: '#89cff0', // Brand Baby Blue
          400: '#5ab8e8',
          500: '#2fa1da',
          600: '#1a87c0',
          700: '#146da0',
          800: '#0f5480',
          900: '#093c5e',
          950: '#051f32',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium':       '0 10px 30px -10px rgba(0,0,0,0.8)',
        'premium-hover': '0 20px 40px -15px rgba(0,0,0,0.9)',
        'glass':         '0 8px 32px 0 rgba(0,0,0,0.6)',
        'premium-blue':  '0 8px 24px -6px rgba(137,207,240,0.30)',
      },
    },
  },
  plugins: [],
}
