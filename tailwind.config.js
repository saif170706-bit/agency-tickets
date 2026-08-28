/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f7f4ee",
        bgalt: "#efe9dc",
        surface: "#ffffff",
        border: "#ddd4bf",
        navy: "#16263a",
        navy2: "#22384f",
        accent: "#8a6a34",
        muted: "#5b6472",
        danger: "#8c2f2f",
        ok: "#2f6b45",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
