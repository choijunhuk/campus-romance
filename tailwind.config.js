/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm campus palette (world_bible art_direction: cream / teal / dusty rose / amber)
        ink: '#17110d', // warm near-black background
        panel: '#241b15', // dialogue / card surface
        cream: '#f6ecda', // primary readable text
        rose: { DEFAULT: '#d98a96', soft: '#ecbcc2' }, // accent — affection / hearts
        amber: { DEFAULT: '#e6a24c', soft: '#f1c890' }, // accent — highlights / sunset
        teal: { DEFAULT: '#7cbcae', soft: '#a9d6cc' }, // secondary accent
      },
      fontFamily: {
        sans: ['Pretendard', 'Pretendard Variable', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
