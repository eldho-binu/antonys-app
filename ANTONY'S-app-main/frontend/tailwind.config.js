/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#F1F6F2',
          100: '#E0ECE2',
          200: '#C3DAC6',
          300: '#A1C3A5',
          400: '#7BA880',
          500: '#528D58',
          600: '#2E6930', // Forest Green Accent/CTA
          700: '#245226', // Darker Forest Green for hover
          800: '#1A3B1B',
          900: '#112512',
        },
        gray: {
          50: '#F0F2F0', // Light Stone Gray Background
          100: '#E2E5E2',
          200: '#C4C9C5',
          300: '#A6ADA8',
          400: '#87918A',
          500: '#67736B',
          600: '#4B544F',
          700: '#3D4541',
          800: '#2C3539', // Charcoal Text/Primary
          900: '#1F2527',
        },
        saffron: {
          50: '#FEF8EB',
          100: '#FDF1D7',
          200: '#FBE0AB',
          300: '#F8CE7F',
          400: '#F6BD53',
          500: '#E0A93D', // Bright Saffron Secondary Accent
          600: '#C9932B',
          700: '#A3741E',
          800: '#7D5613',
          900: '#573B08',
        }
      }
    },
  },
  plugins: [],
}