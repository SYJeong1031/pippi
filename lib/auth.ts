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

type ApiError = {
  error?: string;
};

type LoginResponse = {
  ok: boolean;
  token: string;
  pagerNo: string;
};

const API_URL = "https://ppippi-api.ssyyjeong2012.workers.dev";

const TOKEN_KEY = "pippi_token";
const NUMBER_KEY = "pippi_pager_no";

export const normalizeNumber = (value: string) =>
  value.replace(/\D/g, "").slice(0, 7);

export const formatNumber = (value: string) =>
  value.length > 3
    ? `${value.slice(0, 3)}-${value.slice(3)}`
    : value;

export const validNumber = (value: string) =>
  /^\d{7}$/.test(value);


// ─────────────────────────────
// API RESPONSE
// ─────────────────────────────

async function readJson<T>(
  response: Response
): Promise<T> {
  const body = (await response
    .json()
    .catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(
      body.error || "SYSTEM ERROR — TRY AGAIN"
    );
  }

  return body;
}


// ─────────────────────────────
// LOCAL SESSION
// ─────────────────────────────

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

function getStoredNumber() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(NUMBER_KEY);
}

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NUMBER_KEY);
}


// ─────────────────────────────
// AUTH SERVICE
// ─────────────────────────────

export function createApiAuth(): AuthService {
  return {

    // ─────────────────────────
    // 번호 중복 확인
    // ─────────────────────────

    async checkNumber(number) {
      const normalized =
        normalizeNumber(number);

      if (!validNumber(normalized)) {
        return false;
      }

      const response = await fetch(
        `${API_URL}/api/pager/${normalized}/available`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        await readJson<{
          available: boolean;
        }>(response);

      return data.available;
    },


    // ─────────────────────────
    // 기존 로그인 복원
    // ─────────────────────────

    async getSession() {
      const token =
        getStoredToken();

      const number =
        getStoredNumber();

      if (
        !token ||
        !number ||
        !validNumber(number)
      ) {
        clearStoredSession();
        return null;
      }

      /*
       * 현재 Worker에는 별도의
       * /api/session API가 없으므로
       * 인증이 필요한 /api/pages를 이용해서
       * 토큰이 아직 유효한지 확인한다.
       */

      const response = await fetch(
        `${API_URL}/api/pages`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        }
      );

      if (response.status === 401) {
        clearStoredSession();
        return null;
      }

      if (!response.ok) {
        await readJson(response);
      }

      return {
        number,
      };
    },


    // ─────────────────────────
    // 로그인
    // ─────────────────────────

    async login(credentials) {
      const number =
        normalizeNumber(
          credentials.number
        );

      if (!validNumber(number)) {
        throw new Error(
          "INVALID_PAGER_NUMBER"
        );
      }

      const response = await fetch(
        `${API_URL}/api/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            pagerNo: number,
            password:
              credentials.password,
          }),
        }
      );

      const data =
        await readJson<LoginResponse>(
          response
        );

      localStorage.setItem(
        TOKEN_KEY,
        data.token
      );

      localStorage.setItem(
        NUMBER_KEY,
        data.pagerNo
      );

      return {
        number: data.pagerNo,
      };
    },


    // ─────────────────────────
    // 로그아웃
    // ─────────────────────────

    async logout() {
      const token =
        getStoredToken();

      try {
        if (token) {
          const response =
            await fetch(
              `${API_URL}/api/logout`,
              {
                method: "POST",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (
            !response.ok &&
            response.status !== 401
          ) {
            await readJson(response);
          }
        }
      } finally {
        clearStoredSession();
      }
    },


    // ─────────────────────────
    // 회원가입
    // ─────────────────────────

    async register(credentials) {
      const number =
        normalizeNumber(
          credentials.number
        );

      if (!validNumber(number)) {
        throw new Error(
          "INVALID_PAGER_NUMBER"
        );
      }

      const response = await fetch(
        `${API_URL}/api/register`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            pagerNo: number,
            password:
              credentials.password,
          }),
        }
      );

      await readJson<{
        ok: boolean;
        pagerNo: string;
      }>(response);
    },
  };
}