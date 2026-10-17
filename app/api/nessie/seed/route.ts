import { nessieRequest } from "@/lib/nessie";
let inProgress = false;
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    request.headers.get("origin") !== url.origin
  )
    return Response.json(
      {
        error: "Sandbox creation is only available from this app on localhost.",
      },
      { status: 403 },
    );
  if (inProgress)
    return Response.json(
      { error: "A setup request is already in progress." },
      { status: 409 },
    );
  inProgress = true;
  try {
    const customers = (await nessieRequest("/customers")) as {
      _id: string;
      first_name: string;
      last_name: string;
    }[];
    if (
      customers.some(
        (c) => c.first_name === "Vesta" && c.last_name === "Fictional Test",
      )
    )
      return Response.json(
        {
          error:
            "The Vesta fictional customer already exists. Inspect its accounts; no duplicate was created.",
        },
        { status: 409 },
      );
    const result = (await nessieRequest("/customers", {
      first_name: "Vesta",
      last_name: "Fictional Test",
      address: {
        street_number: "123",
        street_name: "Example Street",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    })) as { objectCreated?: { _id: string }; _id?: string };
    const id = result.objectCreated?._id || result._id;
    if (!id)
      throw new Error(
        "Customer creation returned an unexpected format. Inspect the sandbox before trying again.",
      );
    await nessieRequest(`/customers/${encodeURIComponent(id)}/accounts`, {
      type: "Checking",
      nickname: "Vesta fictional checking",
      rewards: 0,
      balance: 2000,
    });
    return Response.json({ created: true }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sandbox setup failed. Inspect existing customers before retrying.",
      },
      { status: 502 },
    );
  } finally {
    inProgress = false;
  }
}
