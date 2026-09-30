import { AuthError, requireAuthenticatedUser } from "./auth";
import { getDb } from "./d1";

type RecipientRow = { id: number };
type PageRow = {
  id: number;
  sender_number: string;
  numeric_message: string;
  created_at: number;
};

export async function sendPage(input: unknown) {
  if (!input || typeof input !== "object") throw new AuthError("INVALID REQUEST");
  const { recipientNumber, message } = input as Record<string, unknown>;
  if (typeof recipientNumber !== "string" || !/^\d{7}$/.test(recipientNumber)) {
    throw new AuthError("ENTER 7 DIGITS");
  }
  if (typeof message !== "string" || !/^\d{1,15}$/.test(message)) {
    throw new AuthError("NUMERIC MESSAGE ONLY");
  }

  const sender = await requireAuthenticatedUser();
  const db = await getDb();
  const recipient = await db.prepare("SELECT id FROM pippi_users WHERE pager_number = ?")
    .bind(recipientNumber).first<RecipientRow>();
  if (!recipient) throw new AuthError("NO SUCH PAGER", 404);

  const result = await db.prepare(
    "INSERT INTO pippi_pages (sender_user_id, recipient_user_id, numeric_message) VALUES (?, ?, ?)",
  ).bind(sender.id, recipient.id, message).run();
  return { id: Number(result.meta.last_row_id) };
}

export async function getNextUnreadPage() {
  const recipient = await requireAuthenticatedUser();
  const page = await (await getDb()).prepare(
    `SELECT pippi_pages.id, pippi_users.pager_number AS sender_number,
            pippi_pages.numeric_message, pippi_pages.created_at
     FROM pippi_pages JOIN pippi_users ON pippi_users.id = pippi_pages.sender_user_id
     WHERE pippi_pages.recipient_user_id = ? AND pippi_pages.read_at IS NULL
     ORDER BY pippi_pages.created_at ASC, pippi_pages.id ASC LIMIT 1`,
  ).bind(recipient.id).first<PageRow>();
  return page ? {
    id: page.id,
    senderNumber: page.sender_number,
    message: page.numeric_message,
    createdAt: page.created_at,
  } : null;
}

export async function markPageRead(input: unknown) {
  if (!input || typeof input !== "object") throw new AuthError("INVALID REQUEST");
  const id = (input as Record<string, unknown>).id;
  if (!Number.isInteger(id) || Number(id) <= 0) throw new AuthError("INVALID PAGE");
  const recipient = await requireAuthenticatedUser();
  const result = await (await getDb()).prepare(
    "UPDATE pippi_pages SET read_at = unixepoch() WHERE id = ? AND recipient_user_id = ? AND read_at IS NULL",
  ).bind(Number(id), recipient.id).run();
  if (result.meta.changes === 0) throw new AuthError("PAGE NOT FOUND", 404);
}
