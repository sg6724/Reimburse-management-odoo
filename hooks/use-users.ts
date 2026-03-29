"use client";
import { useState, useEffect, useCallback } from "react";
import type { UserWithManager } from "@/types";

export function useUsers() {
  const [users, setUsers] = useState<UserWithManager[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { users, loading, refetch };
}
