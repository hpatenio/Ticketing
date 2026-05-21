// @ts-ignore: CSS module import side effect
import "./global.css";  // ← MUST be line 1, before everything
import AuthScreen from "./AuthScreen";

export default function App() {
  return <AuthScreen />;
}