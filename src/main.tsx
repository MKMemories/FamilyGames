import { createRoot } from "react-dom/client";
import App from "./App";
import { getInitialTheme, applyTheme } from "./hooks/useTheme";
import "./index.css";

// Apply the saved/system theme before first paint to avoid a flash.
applyTheme(getInitialTheme());

createRoot(document.getElementById("root")!).render(<App />);
