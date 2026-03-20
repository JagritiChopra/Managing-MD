/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors:{
         primary: '#3B82F6',
        secondary: '#10B981',
        'background-light': '#f7f6f8',
        'background-dark': '#0B1220',
        surface: '#111827',
        'surface-light': '#1F2937',
        'text-main': '#E5E7EB',
        'text-sub': '#9CA3AF',
      },
    },
  },
  plugins: [],
}