import { errorResponse, login } from "../../../../lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return Response.json(await login(await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}
