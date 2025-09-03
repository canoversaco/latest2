export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: { bg:'#F7FAFC', card:'#FFFFFF', text:'#0F172A', subtle:'#64748B', line:'#E2E8F0' },
        brand: { mint:'#00E5A8', violet:'#6C63FF', amber:'#FFB020', gold:'#FFD54F' }
      },
      boxShadow: {
        card: '0 8px 24px rgba(16,24,40,.08)',
        press: 'inset 0 0 0 1px rgba(2,6,23,.1), 0 1px 2px rgba(16,24,40,.06)'
      },
      borderRadius: { xl2: '1.25rem', '4xl': '2rem' },
      keyframes: {
        sheen: { '0%':{backgroundPosition:'0% 50%'}, '100%':{backgroundPosition:'100% 50%'} }
      },
      animation: { sheen: 'sheen 5s linear infinite' }
    }
  },
  plugins: []
}
