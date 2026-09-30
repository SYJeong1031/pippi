export type AppMode = "boot" | "login" | "register" | "pager";
export type PagerSession = { number: string };
export type Credentials = { number: string; password: string };

export interface AuthService {
  checkNumber(number: string): Promise<boolean>;
  getSession(): Promise<PagerSession | null>;
  login(credentials: Credentials): Promise<PagerSession>;
  logout(): Promise<void>;
  register(credentials: Credentials): Promise<void>;
}

type ApiError = { error?: string };

export const normalizeNumber = (value: string) => value.replace(/\D/g, "").slice(0, 7);
export const formatNumber = (value: string) => value.length > 3 ? `${value.slice(0, 3)}-${value.slice(3)}` : value;
export const validNumber = (value: string) => /^\d{7}$/.test(value);

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(body.error || "SYSTEM ERROR — TRY AGAIN");
  return body;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  return readJson<T>(await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
}

export function createApiAuth(): AuthService {
  return {
    async checkNumber(number) {
      if (!validNumber(number)) return false;
      const query = new URLSearchParams({ number });
      return (await readJson<{ available: boolean }>(await fetch(`/api/auth/availability?${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      }))).available;
    },
    async getSession() {
      const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) return null;
      return readJson<PagerSession>(response);
    },
    login(credentials) {
      return post<PagerSession>("/api/auth/login", credentials);
    },
    async logout() {
      await post<{ ok: true }>("/api/auth/logout");
    },
    async register(credentials) {
      await post<{ ok: true }>("/api/auth/register", credentials);
    },
  };
}
