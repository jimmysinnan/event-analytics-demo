/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#05080F',
          surface: '#0A1020',
          card:    '#0D1526',
          elevated:'#111D33',
          border:  '#1A2840',
        },
        primary: {
          50:  '#EFF8FF',
          400: '#21AAFA',
          500: '#068EEA',
          600: '#0070C8',
          700: '#0059A2',
        },
        accent: {
          gold:   '#F59E0B',
          teal:   '#06B6D4',
          coral:  '#F97316',
          violet: '#8B5CF6',
          green:  '#10B981',
          red:    '#EF4444',
        },
        text: {
          primary:   '#F0F4FF',
          secondary: '#8B9BB4',
          muted:     '#4A5568',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-card':    'linear-gradient(135deg, rgba(13,21,38,0.9) 0%, rgba(10,16,32,0.6) 100%)',
        'gradient-primary': 'linear-gradient(135deg, #068EEA 0%, #0059A2 100%)',
        'gradient-gold':    'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'gradient-teal':    'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
        'gradient-violet':  'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        'gradient-green':   'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-hero':    'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(6,142,234,0.12) 0%, transparent 70%)',
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glow-blue':  '0 0 24px rgba(6,142,234,0.25)',
        'glow-gold':  '0 0 24px rgba(245,158,11,0.25)',
        'glow-teal':  '0 0 24px rgba(6,182,212,0.25)',
        'inner-top':  'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                                            to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' },              to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-8px)' },             to: { opacity: '1', transform: 'translateX(0)' } },
      },
      transitionTimingFunction: { spring: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [],
}
