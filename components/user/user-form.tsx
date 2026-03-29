"use client";
import { useState } from "react";
import { Input, Button, Dropdown } from "@/components/ui";
import type { UserWithManager } from "@/types";

interface UserFormProps {
  managers: UserWithManager[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserForm({ managers, onSuccess, onCancel }: UserFormProps) {
  const [error, setError] = useState<string>();

  const managerOptions = managers
    .filter((u) => u.role === "MANAGER")
    .map((u) => ({ value: u.id, label: u.name }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const data = new FormData(e.currentTarget);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        role: data.get("role"),
        managerId: data.get("managerId") || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to create user");
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input id="name" name="name" label="Full Name" required />
      <Input id="email" name="email" type="email" label="Email" required />
      <Dropdown
        id="role"
        name="role"
        label="Role"
        options={[
          { value: "EMPLOYEE", label: "Employee" },
          { value: "MANAGER", label: "Manager" },
        ]}
        required
      />
      {managerOptions.length > 0 && (
        <Dropdown
          id="managerId"
          name="managerId"
          label="Manager (for Employees)"
          options={managerOptions}
          placeholder="None"
        />
      )}
      {error && <p className="text-sm text-[#E05252]">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create User</Button>
      </div>
    </form>
  );
}
