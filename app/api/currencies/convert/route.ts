import { convertCurrency } from "@/lib/currency";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const amount = parseFloat(searchParams.get("amount") ?? "0");
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  if (!amount || !from || !to) {
    return Response.json({ error: "amount, from, to are required" }, { status: 400 });
  }

  try {
    const result = await convertCurrency(amount, from, to);
    return Response.json(result);
  } catch {
    return Response.json({ error: "Conversion failed" }, { status: 500 });
  }
}
