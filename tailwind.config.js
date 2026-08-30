/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#f0f8f9",
        bgalt:   "#e4f1f2",
        surface: "#ffffff",
        border:  "#cde4e6",
        dark:    "#003135",
        dark2:   "#024950",
        accent:  "#0fa4af",
        accent2: "#0d8f99",
        muted:   "#5a7a7d",
        danger:  "#8c2f2f",
        ok:      "#0fa4af",
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Segoe UI"', "Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};
