"use client";
import { createContext, useContext, useEffect, useState } from "react";
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const Context = createContext<{
  prompt: InstallPromptEvent | null;
  installed: boolean;
  clearPrompt: () => void;
}>({ prompt: null, installed: false, clearPrompt: () => {} });
export function InstallProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null),
    [installed, setInstalled] = useState(false);
  useEffect(() => {
    const mode = matchMedia("(display-mode: standalone)");
    const update = () =>
      setInstalled(
        mode.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const added = () => {
      setInstalled(true);
      setPrompt(null);
    };
    update();
    mode.addEventListener("change", update);
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", added);
    return () => {
      mode.removeEventListener("change", update);
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", added);
    };
  }, []);
  return (
    <Context.Provider
      value={{ prompt, installed, clearPrompt: () => setPrompt(null) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useInstall = () => useContext(Context);
