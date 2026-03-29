import { fetchAllCountryCurrencies } from "@/lib/currency";

export async function GET() {
  try {
    const currencies = await fetchAllCountryCurrencies();
    return Response.json(currencies);
  } catch {
    return Response.json({ error: "Failed to fetch currencies" }, { status: 500 });
  }
}
