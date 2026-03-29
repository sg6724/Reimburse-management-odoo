"use client";
import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { UserTable } from "@/components/user/user-table";
import { UserForm } from "@/components/user/user-form";
import { useUsers } from "@/hooks/use-users";

export default function UsersPage() {
  const { users, loading, refetch } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [sendingPasswordUserId, setSendingPasswordUserId] = useState<string | null>(null);

  async function handleSendPassword(userId: string) {
    setActionError(undefined);
    setActionSuccess(undefined);
    setSendingPasswordUserId(userId);

    try {
      const res = await fetch(`/api/users/${userId}/send-password`, { method: "POST" });

      if (!res.ok) {
        let message = "Failed to send password email.";
        try {
          const body = await res.json();
          message = body.error ?? message;
        } catch {
          // Keep a safe fallback when response is not JSON.
        }
        setActionError(message);
        return;
      }

      setActionSuccess("Password email sent successfully.");
    } finally {
      setSendingPasswordUserId(null);
    }
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
        sendingPasswordUserId={sendingPasswordUserId}
        onUpdateRole={handleUpdateRole}
        onUpdateManager={handleUpdateManager}
      />

      {actionError && <p className="text-sm text-[#E05252]">{actionError}</p>}
      {actionSuccess && <p className="text-sm text-[#4CAF7C]">{actionSuccess}</p>}

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
