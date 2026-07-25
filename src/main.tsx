
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);

  // Best-effort orientation lock — supported on some Android browsers in
  // fullscreen/standalone contexts. iOS Safari never implemented this API
  // at all, which is why the CSS landscape-blocker in index.html is the
  // real cross-platform fix; this is just a bonus where it works.
  try {
    const orientation = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
    orientation?.lock?.('portrait').catch(() => {});
  } catch {
    // Unsupported — the CSS blocker handles this case instead.
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {
        // Offline support degrades gracefully if registration fails (e.g. unsupported browser).
      });
    });
  }
  