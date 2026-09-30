const WORKER_ORIGIN = "https://ppippi-api.ssyyjeong2012.workers.dev";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const incomingUrl = new URL(request.url);
  const target = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, WORKER_ORIGIN);
  target.search = incomingUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    console.error("PIPPI Worker proxy failed", error);
    return Response.json({ error: "API_UNAVAILABLE" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
