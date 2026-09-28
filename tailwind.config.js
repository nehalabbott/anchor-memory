/** Design tokens taken from the Lab 5 wireframes (mint/teal calm palette). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17313A',          // AAA-contrast body text
        mist: '#EAF4F4',         // app background
        garden: { 50: '#F0FBF4', 100: '#D3F6E3', 500: '#0F9E7F', 600: '#0B8A70', 700: '#0B6B5C', 900: '#0F3F3A' },
        mint: { 100: '#CCF8EE', 200: '#A7F0DE' },
        rose: { soft: '#FFE1E3', deep: '#A80F35', main: '#E11D48' },
        sky: { soft: '#DDF0FD', deep: '#075985', main: '#0284C7' },
        sun: { soft: '#FBF7C3', deep: '#7A3C0B', main: '#D97706' },
        iris: { soft: '#F0E6FE', deep: '#5B21B6', main: '#7C3AED' },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Senior-friendly scale: nothing below 18px for interactive text
        base: ['1.125rem', '1.6'],
        lg: ['1.25rem', '1.5'],
        xl: ['1.5rem', '1.35'],
        '2xl': ['1.875rem', '1.25'],
        '3xl': ['2.25rem', '1.15'],
      },
      borderRadius: { card: '1.5rem', pill: '999px' },
      boxShadow: { soft: '0 6px 24px -10px rgba(15,63,58,.25)' },
      keyframes: {
        pulseRing: { '0%': { transform: 'scale(1)', opacity: '.6' }, '100%': { transform: 'scale(1.6)', opacity: '0' } },
        rise: { from: { transform: 'translateY(12px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: { pulseRing: 'pulseRing 1.6s ease-out infinite', rise: 'rise .28s ease-out' },
    },
  },
  plugins: [],
}
