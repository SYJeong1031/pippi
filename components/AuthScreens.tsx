"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { formatNumber, normalizeNumber, validNumber, type AuthService, type PagerSession } from "../lib/auth";

function Terminal({ children }: { children: ReactNode }) {
  return <main className="auth-stage"><section className="auth-shell" aria-label="PIPPI terminal">
    <div className="auth-bezel"><div className="auth-lcd">{children}</div></div>
    <div className="auth-brand">PIPPI <span>PERSONAL PAGER SYSTEM</span></div>
  </section></main>;
}

export function BootScreen({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onReady, 1400);
    return () => window.clearTimeout(timer);
  }, [onReady]);
  return <Terminal><div className="boot-screen" role="status" aria-label="PIPPI SYSTEM CHECK READY">
    <h1>PIPPI</h1><p className="boot-check">SYSTEM CHECK</p>
    <p className="boot-progress" aria-hidden="true">••••••••</p><p className="boot-ready">READY</p>
  </div></Terminal>;
}

type Props = {
  mode: "login" | "register";
  auth: AuthService;
  initialNumber: string;
  onSwitch: () => void;
  onLogin: (session: PagerSession) => void;
  onRegistered: (number: string) => void;
};

export function AuthScreen({ mode, auth, initialNumber, onSwitch, onLogin, onRegistered }: Props) {
  const registering = mode === "register";
  const [number, setNumber] = useState(registering ? "" : initialNumber);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [check, setCheck] = useState<{ number: string; available: boolean } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const active = useRef(true);
  const submitting = useRef(false);
  const doneTimer = useRef<number | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (doneTimer.current !== null) window.clearTimeout(doneTimer.current); };
  }, []);
  useEffect(() => {
    if (!registering || !validNumber(number)) return;
    let cancelled = false;
    auth.checkNumber(number).then(available => {
      if (!cancelled) setCheck({ number, available });
    }).catch(() => { if (!cancelled) setError("CHECK FAILED — TRY AGAIN"); });
    return () => { cancelled = true; };
  }, [auth, registering, number]);

  const availability = !validNumber(number) ? "7 DIGITS REQUIRED" : check?.number !== number
    ? "CHECKING..." : check.available ? "AVAILABLE" : "IN USE";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || registered) return;
    setError("");
    if (!validNumber(number)) return setError("ENTER 7 DIGITS");
    if (!password) return setError("ENTER PASSWORD");
    if (registering && availability !== "AVAILABLE") return setError(availability);
    if (registering && password !== confirm) return setError("PASSWORDS DO NOT MATCH");
    submitting.current = true;
    setBusy(true);
    try {
      if (registering) {
        await auth.register({ number, password });
        if (!active.current) return;
        setRegistered(true);
        setPassword(""); setConfirm("");
        doneTimer.current = window.setTimeout(() => onRegistered(number), 1000);
      } else {
        const session = await auth.login({ number, password });
        if (active.current) onLogin(session);
      }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : "SYSTEM ERROR — TRY AGAIN");
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  return <Terminal><div className="auth-enter">
    <header className="auth-heading"><h1>PIPPI</h1><span>{registering ? "REGISTER" : "SIGN ON"}</span></header>
    {registered ? <div className="registered-screen" role="status">REGISTERED</div> :
    <form onSubmit={submit} noValidate>
      <fieldset disabled={busy}>
        <label htmlFor="pager-number">{registering ? "CHOOSE YOUR NUMBER" : "PAGER NUMBER"}</label>
        <input id="pager-number" name="username" type="text" inputMode="numeric" autoComplete="username"
          placeholder="___-____" value={formatNumber(number)} autoCapitalize="none" spellCheck={false}
          onChange={event => { setNumber(normalizeNumber(event.target.value)); setCheck(null); setError(""); }} />
        {registering && <p className="availability" role="status">{availability}</p>}
        <label htmlFor="password">PASSWORD</label>
        <input id="password" name="password" type="password" autoComplete={registering ? "new-password" : "current-password"}
          value={password} onChange={event => { setPassword(event.target.value); setError(""); }} />
        {registering && <><label htmlFor="confirm">CONFIRM</label><input id="confirm" name="confirm" type="password"
          autoComplete="new-password" value={confirm} onChange={event => { setConfirm(event.target.value); setError(""); }} /></>}
        <p className="auth-error" role="alert">{error || "\u00a0"}</p>
        <button className="auth-key" type="submit" disabled={busy || (registering && availability !== "AVAILABLE")}>
          {busy ? "PLEASE WAIT..." : registering ? "REGISTER" : "ENTER"}
        </button>
        <button className="auth-back" type="button" onClick={onSwitch}>{registering ? "BACK" : "NEW USER → REGISTER"}</button>
      </fieldset>
    </form>}
  </div></Terminal>;
}
