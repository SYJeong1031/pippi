import { errorResponse, numberIsAvailable } from "../../../../lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const number = new URL(request.url).searchParams.get("number") || "";
    return Response.json({ available: await numberIsAvailable(number) });
  } catch (error) {
    return errorResponse(error);
  }
}
