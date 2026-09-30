import { errorResponse } from "../../../../lib/server/auth";
import { markPageRead } from "../../../../lib/server/pages";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await markPageRead(await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
