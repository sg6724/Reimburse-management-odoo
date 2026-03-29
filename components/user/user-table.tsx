"use client";
import { Table, Thead, Tbody, Th, Td, Tr, Badge, Button, Dropdown } from "@/components/ui";
import type { UserWithManager } from "@/types";

interface UserTableProps {
  users: UserWithManager[];
  onSendPassword: (userId: string) => Promise<void>;
  sendingPasswordUserId: string | null;
  onUpdateRole: (userId: string, role: "MANAGER" | "EMPLOYEE") => void;
  onUpdateManager: (userId: string, managerId: string | null) => void;
}

export function UserTable({
  users,
  onSendPassword,
  sendingPasswordUserId,
  onUpdateRole,
  onUpdateManager,
}: UserTableProps) {
  const managers = users.filter((u) => u.role === "MANAGER");
  const managerOptions = [
    { value: "", label: "None" },
    ...managers.map((m) => ({ value: m.id, label: m.name })),
  ];

  return (
    <Table>
      <Thead>
        <tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>Manager</Th>
          <Th>Actions</Th>
        </tr>
      </Thead>
      <Tbody>
        {users.map((user) => (
          <Tr key={user.id}>
            <Td>{user.name}</Td>
            <Td className="text-[#6B7280]">{user.email}</Td>
            <Td>
              {user.role === "ADMIN" ? (
                <Badge>Admin</Badge>
              ) : (
                <Dropdown
                  options={[
                    { value: "EMPLOYEE", label: "Employee" },
                    { value: "MANAGER", label: "Manager" },
                  ]}
                  value={user.role}
                  onChange={(e) =>
                    onUpdateRole(user.id, e.target.value as "MANAGER" | "EMPLOYEE")
                  }
                  className="w-32"
                />
              )}
            </Td>
            <Td>
              {user.role === "EMPLOYEE" ? (
                <Dropdown
                  options={managerOptions}
                  value={user.managerId ?? ""}
                  onChange={(e) =>
                    onUpdateManager(user.id, e.target.value || null)
                  }
                  className="w-40"
                />
              ) : (
                <span className="text-[#6B7280]">—</span>
              )}
            </Td>
            <Td>
              {user.role !== "ADMIN" && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={sendingPasswordUserId === user.id}
                  onClick={() => onSendPassword(user.id)}
                >
                  {sendingPasswordUserId === user.id ? "Sending..." : "Send Password"}
                </Button>
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
