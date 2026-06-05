"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Registers the service worker in production so the app works offline. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const register = () =>
      navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}

/** "Install app" button — only shown when the browser offers installation. */
export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        setDeferred(null);
      }}
      className="btn btn-ghost !py-2 !px-3 text-xs"
      style={{ borderColor: "var(--violet)", color: "var(--violet)" }}
    >
      <Smartphone size={14} /> Zainstaluj
    </button>
  );
}
