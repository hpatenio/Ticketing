module.exports = {
  content: [
  "./App.{js,jsx,ts,tsx}",
  "./AuthScreen.{js,jsx,ts,tsx}",
  "./SuperAdminDashboard.{js,jsx,ts,tsx}",
  "./EmployeeDashboard.{js,jsx,ts,tsx}",
  "./AdminDashboard.{js,jsx,ts,tsx}",
  "./app/**/*.{js,jsx,ts,tsx}",
  "./Components/**/*.{js,jsx,ts,tsx}",
],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}