export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Same-origin requests only." },
      { status: 403 },
    );
  try {
    const body = await request.json();
    if (body.confirmed !== true || !["local", "database"].includes(body.store))
      return Response.json(
        { error: "Confirm a planning storage choice." },
        { status: 400 },
      );
    return Response.json(
      {
        store: body.store,
        notice:
          "This selects a separate fictional planning store. No records are moved or deleted.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `vesta-demo-store=${body.store}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Storage choice unavailable." },
      { status: 400 },
    );
  }
}
