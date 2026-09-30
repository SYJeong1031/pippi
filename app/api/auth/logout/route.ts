import { errorResponse, logout } from "../../../../lib/server/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await logout();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
