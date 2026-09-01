import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* 「闻野」品牌色阶：森绿。与 src/styles/globals.css 的 --primary-* / --brand 保持同源，
           避免 Tailwind 工具类（bg-primary-600 等）与 CSS 变量出现两套强调色。 */
        primary: {
          50: '#e8f3ed',
          100: '#cde8dc',
          200: '#a9d8c3',
          300: '#7cc3a5',
          400: '#46ac86',
          500: '#219a70',
          600: '#1a7f5a',
          700: '#12634a',
          800: '#0e4a37',
          900: '#0a3427',
        },
        accent: {
          500: '#d98324',
        },
        success: '#12b76a',
        warning: '#d98324',
        danger: '#d92d20',
        info: '#219a70',
      },
      fontFamily: {
        sans: ['PingFang SC', '"Microsoft YaHei"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['15px', { lineHeight: '1.7' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['22px', { lineHeight: '1.4' }],
        '2xl': ['28px', { lineHeight: '1.3' }],
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(20, 30, 25, 0.05)',
        card: '0 8px 24px rgba(20, 30, 25, 0.07)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
} satisfies Config
