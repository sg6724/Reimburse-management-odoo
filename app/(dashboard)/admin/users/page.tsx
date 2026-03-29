"use client";
import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { UserTable } from "@/components/user/user-table";
import { UserForm } from "@/components/user/user-form";
import { useUsers } from "@/hooks/use-users";

export default function UsersPage() {
  const { users, loading, refetch } = useUsers();
  const [showForm, setShowForm] = useState(false);

  async function handleSendPassword(userId: string) {
    await fetch(`/api/users/${userId}/send-password`, { method: "POST" });
    alert("Password sent!");
  }

  async function handleUpdateRole(userId: string, role: "MANAGER" | "EMPLOYEE") {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    refetch();
  }

  async function handleUpdateManager(userId: string, managerId: string | null) {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });
    refetch();
  }

  if (loading) return <p className="text-[#6B7280]">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#1A1A2E]">Users</h1>
        <Button onClick={() => setShowForm(true)}>Add User</Button>
      </div>

      <UserTable
        users={users}
        onSendPassword={handleSendPassword}
        onUpdateRole={handleUpdateRole}
        onUpdateManager={handleUpdateManager}
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add New User"
      >
        <UserForm
          managers={users}
          onSuccess={() => {
            setShowForm(false);
            refetch();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
