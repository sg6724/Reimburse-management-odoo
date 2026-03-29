"use client";
import { useState, useEffect, useCallback } from "react";
import type { UserWithManager } from "@/types";

export function useUsers() {
  const [users, setUsers] = useState<UserWithManager[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    async function loadInitialUsers() {
      try {
        const response = await fetch("/api/users");
        const data = await response.json();
        if (!canceled) {
          setUsers(data);
        }
      } finally {
        if (!canceled) {
        setLoading(false);
        }
      }
    }

    void loadInitialUsers();

    return () => {
      canceled = true;
    };
  }, []);

  return { users, loading, refetch };
}
