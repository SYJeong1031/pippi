import { errorResponse } from "../../../../lib/server/auth";
import { sendPage } from "../../../../lib/server/pages";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return Response.json(await sendPage(await request.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
