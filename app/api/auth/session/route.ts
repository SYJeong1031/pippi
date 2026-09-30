import { errorResponse, getSession } from "../../../../lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    return session ? Response.json(session) : Response.json({ error: "NOT SIGNED IN" }, { status: 401 });
  } catch (error) {
    return errorResponse(error);
  }
}
