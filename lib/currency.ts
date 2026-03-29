export interface CountryCurrency {
  countryName: string;
  currencyCode: string;
  currencyName: string;
}

export async function fetchAllCountryCurrencies(): Promise<CountryCurrency[]> {
  const res = await fetch(
    "https://restcountries.com/v3.1/all?fields=name,currencies",
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error("Failed to fetch countries");

  const data: Array<{
    name: { common: string };
    currencies?: Record<string, { name: string }>;
  }> = await res.json();

  const results: CountryCurrency[] = [];
  for (const country of data) {
    if (!country.currencies) continue;
    for (const [code, info] of Object.entries(country.currencies)) {
      results.push({
        countryName: country.name.common,
        currencyCode: code,
        currencyName: info.name,
      });
    }
  }

  return results.sort((a, b) => a.countryName.localeCompare(b.countryName));
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{ convertedAmount: number; exchangeRateUsed: number }> {
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  const url = apiKey
    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${from}`
    : `https://api.exchangerate-api.com/v4/latest/${from}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Failed to fetch exchange rates");

  const data = await res.json();
  const rates = data.rates ?? data.conversion_rates;
  const rate: number = rates[to];

  if (!rate) throw new Error(`No rate found for ${to}`);

  return {
    convertedAmount: Math.round(amount * rate * 100) / 100,
    exchangeRateUsed: rate,
  };
}
