import { errorResponse, register } from "../../../../lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await register(await request.json());
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
