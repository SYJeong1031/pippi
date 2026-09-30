"use client";

import { useCallback, useState } from "react";
import Pager from "../components/Pager";
import { AuthScreen, BootScreen } from "../components/AuthScreens";
import { createApiAuth, type AppMode, type PagerSession } from "../lib/auth";

export default function Home() {
  const [mode, setMode] = useState<AppMode>("boot");
  const [session, setSession] = useState<PagerSession | null>(null);
  const [auth] = useState(createApiAuth);
  const [registeredNumber, setRegisteredNumber] = useState("");

  const finishBoot = useCallback(async () => {
    try {
      const current = await auth.getSession();
      if (current) {
        setSession(current);
        setMode("pager");
        return;
      }
    } catch {
      // Keep the login screen usable when the backend is temporarily unavailable.
    }
    setMode("login");
  }, [auth]);

  if (mode === "pager" && session) return <Pager number={session.number} onLogout={async () => {
    try {
      await auth.logout();
    } finally {
      setSession(null);
      setMode("login");
    }
  }} />;
  if (mode === "boot") return <BootScreen onReady={finishBoot} />;
  return <AuthScreen key={mode} mode={mode === "register" ? "register" : "login"}
    auth={auth} initialNumber={registeredNumber}
    onSwitch={() => setMode(mode === "register" ? "login" : "register")}
    onLogin={user => { setSession(user); setMode("pager"); }}
    onRegistered={number => { setRegisteredNumber(number); setMode("login"); }} />;
}
