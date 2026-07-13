import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA service worker registration — guarded against iframes / Lovable preview hosts.
if ("serviceWorker" in navigator) {
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreview = host.includes("lovableproject.com") || host.includes("lovable.app") && host.includes("id-preview");

  if (inIframe || isPreview) {
    // Make sure no stale SW lingers in preview/iframe contexts
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("[OKAY] service worker registered"))
        .catch((err) => console.warn("[OKAY] sw registration failed", err));
    });
  }
}
