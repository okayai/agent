import { useEffect, useState } from "react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Floating "> INSTALL SYSTEM" prompt — listens for beforeinstallprompt. */
export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onOff = () => setOffline(true);
    const onOn = () => setOffline(false);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
    };
  }, []);

  if (offline) {
    return (
      <div className="fixed bottom-3 left-3 right-3 z-50 max-w-md mx-auto bg-card/90 border border-warning/60 rounded-md p-3 text-[11px] font-mono text-warning backdrop-blur-md">
        <div className="tracking-[0.3em] mb-1">[OFFLINE MODE]</div>
        <div>{"> Cannot fetch live data."}</div>
        <div>{"> Loading cached experience..."}</div>
        <div>{"> Connect to network for full functionality."}</div>
      </div>
    );
  }

  if (!evt || hidden) return null;

  return (
    <button
      onClick={async () => {
        await evt.prompt();
        await evt.userChoice;
        setEvt(null);
      }}
      className="fixed bottom-3 left-3 right-3 z-50 max-w-md mx-auto bg-card/90 border border-primary/60 rounded-md px-4 py-3 text-[12px] font-mono text-primary tracking-[0.25em] backdrop-blur-md hover:bg-primary/10 transition-colors flex items-center justify-between"
      style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.25)" }}
    >
      <span>{"> INSTALL SYSTEM"}</span>
      <span
        onClick={(e) => { e.stopPropagation(); setHidden(true); }}
        className="text-muted-foreground hover:text-foreground"
      >×</span>
    </button>
  );
}
