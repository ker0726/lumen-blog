import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',      // 近黑墨：全局底色
        paper: '#F7F5F0',    // 纸白：阅读区反色
        accent: '#FF4D00',   // 电光橙：主强调
        volt: '#C6FF00',     // 荧光绿：次强调
        grape: '#6C2BD9',    // 深紫：点缀
        magenta: '#FF2E63',  // 品红：点缀
        fog: '#A3A3A3',      // 灰度一档：次要文字
        smoke: '#525252',    // 灰度二档：弱化边框
        carbon: '#262626',   // 灰度三档：卡片底/分割线
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Noto Sans SC"', 'sans-serif'],
        body: ['Inter', '"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [typography],
};
