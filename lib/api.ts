const API_URL = "https://ppippi-api.ssyyjeong2012.workers.dev";

export type ApiPage = {
  id: string;
  message: string;
  created_at: string;
  viewed_at: string | null;
  sender_pager_no: string;
};

type ApiError = {
  error?: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = (await response.json()) as T & ApiError;

  if (!response.ok) {
    throw new Error(data.error || "API_ERROR");
  }

  return data;
}

// ─────────────────────────────
// 삐삐 번호 중복 확인
// ─────────────────────────────

export async function checkPagerNumber(
  pagerNo: string
): Promise<boolean> {
  const data = await request<{ available: boolean }>(
    `/api/pager/${pagerNo}/available`
  );

  return data.available;
}

// ─────────────────────────────
// 회원가입
// ─────────────────────────────

export async function register(
  pagerNo: string,
  password: string
) {
  return request<{
    ok: boolean;
    pagerNo: string;
  }>("/api/register", {
    method: "POST",
    body: JSON.stringify({
      pagerNo,
      password,
    }),
  });
}

// ─────────────────────────────
// 로그인
// ─────────────────────────────

export async function login(
  pagerNo: string,
  password: string
) {
  const data = await request<{
    ok: boolean;
    token: string;
    pagerNo: string;
  }>("/api/login", {
    method: "POST",
    body: JSON.stringify({
      pagerNo,
      password,
    }),
  });

  localStorage.setItem("pippi_token", data.token);
  localStorage.setItem("pippi_pager_no", data.pagerNo);

  return data;
}

// ─────────────────────────────
// 현재 로그인 토큰
// ─────────────────────────────

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("pippi_token");
}

export function getSavedPagerNumber() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("pippi_pager_no");
}

// ─────────────────────────────
// 로그아웃
// ─────────────────────────────

export async function logout() {
  const token = getToken();

  if (token) {
    try {
      await request<{ ok: boolean }>("/api/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // 서버 로그아웃에 실패하더라도
      // 로컬 로그인 정보는 제거한다.
    }
  }

  localStorage.removeItem("pippi_token");
  localStorage.removeItem("pippi_pager_no");
}

// ─────────────────────────────
// PAGE 전송
// ─────────────────────────────

export async function sendPage(
  receiver: string,
  message: string
) {
  const token = getToken();

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  return request<{
    ok: boolean;
    id: string;
  }>("/api/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      receiver,
      message,
    }),
  });
}

// ─────────────────────────────
// 받은 PAGE 목록
// ─────────────────────────────

export async function getPages() {
  const token = getToken();

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const data = await request<{
    pages: ApiPage[];
  }>("/api/pages", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.pages;
}

// ─────────────────────────────
// PAGE 확인 처리
// ─────────────────────────────

export async function markPageViewed(pageId: string) {
  const token = getToken();

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  return request<{ ok: boolean }>(
    `/api/pages/${encodeURIComponent(pageId)}/view`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}