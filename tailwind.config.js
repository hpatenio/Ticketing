module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./AuthScreen.{js,jsx,ts,tsx}",  // ← add this explicitly
    "./app/**/*.{js,jsx,ts,tsx}",
    "./Components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}