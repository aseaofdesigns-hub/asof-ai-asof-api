import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!localStorage.getItem("asof_fp")) {
  localStorage.setItem("asof_fp", `fp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
}

createRoot(document.getElementById("root")!).render(<App />);
