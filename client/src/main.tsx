import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Generate a fingerprint for this browser if none exists
if (!localStorage.getItem("asof_fp")) {
  localStorage.setItem("asof_fp", `fp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
}
// Accumulate ALL fingerprints ever used on this browser so history is never lost
try {
  const fp = localStorage.getItem("asof_fp")!;
  const existing: string[] = JSON.parse(localStorage.getItem("asof_fps") ?? "[]");
  if (!existing.includes(fp)) {
    existing.push(fp);
    localStorage.setItem("asof_fps", JSON.stringify(existing));
  }
} catch { localStorage.setItem("asof_fps", JSON.stringify([localStorage.getItem("asof_fp")])); }

createRoot(document.getElementById("root")!).render(<App />);
