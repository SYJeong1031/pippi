import { getPages, markPageViewed, sendPage } from "./api";

export type ReceivedPage = {
  id: string | number;
  senderNumber: string;
  message: string;
  createdAt: number;
};

export async function sendNumericPage(recipientNumber: string, message: string) {
  return sendPage(recipientNumber, message);
}

export async function getUnreadPage(): Promise<ReceivedPage | null> {
  const pages = await getPages();
  const page = pages
    .filter((item) => item.viewed_at === null)
    .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at))[0];

  if (!page) return null;
  return {
    id: page.id,
    senderNumber: page.sender_pager_no,
    message: page.message,
    createdAt: Math.floor(Date.parse(page.created_at) / 1000),
  };
}

export async function markPageRead(id: string | number) {
  if (id === 0) return;
  await markPageViewed(String(id));
}
