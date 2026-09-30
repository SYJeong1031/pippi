export type ReceivedPage = {
  id: number;
  senderNumber: string;
  message: string;
  createdAt: number;
};

type ApiError = { error?: string };

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(body.error || "PAGE FAILED");
  return body;
}

export async function sendNumericPage(recipientNumber: string, message: string) {
  return readJson<{ id: number }>(await fetch("/api/pages/send", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientNumber, message }),
  }));
}

export async function getUnreadPage() {
  return readJson<{ page: ReceivedPage | null }>(await fetch("/api/pages/inbox", {
    credentials: "same-origin",
    cache: "no-store",
  })).then((result) => result.page);
}

export async function markPageRead(id: number) {
  await readJson<{ ok: true }>(await fetch("/api/pages/read", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }));
}
