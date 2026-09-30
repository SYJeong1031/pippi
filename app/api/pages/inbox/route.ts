import { errorResponse } from "../../../../lib/server/auth";
import { getNextUnreadPage } from "../../../../lib/server/pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ page: await getNextUnreadPage() });
  } catch (error) {
    return errorResponse(error);
  }
}
