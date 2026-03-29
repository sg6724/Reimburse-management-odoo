"use client";
import { useState, useEffect } from "react";
import type { CountryCurrency } from "@/lib/currency";

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<CountryCurrency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/currencies")
      .then((r) => r.json())
      .then((data) => {
        setCurrencies(data);
        setLoading(false);
      });
  }, []);

  return { currencies, loading };
}
