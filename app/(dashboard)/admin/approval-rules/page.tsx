"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApprovalRuleForm, type ApprovalRuleFormValue } from "@/components/approval/approval-rule-form";
import { Badge, Button, Modal, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui";

interface WorkflowRule {
  id: string;
  name: string;
  isActive: boolean;
  isSequential: boolean;
  managerApproverFirst: boolean;
  ruleType: "ALL" | "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID";
  percentageThreshold: number | null;
  specificApproverId: string | null;
  steps: Array<{ id: string; stepOrder: number; label: string; approver: { id: string; name: string } }>;
}

interface UserOption {
  id: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

export default function ApprovalRulesPage() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const approvers = useMemo(
    () => users.filter((u) => u.role !== "EMPLOYEE").map((u) => ({ id: u.id, name: u.name })),
    [users]
  );

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [rulesRes, usersRes] = await Promise.all([
        fetch("/api/approval-rules"),
        fetch("/api/users"),
      ]);
      const [rulesData, usersData] = await Promise.all([rulesRes.json(), usersRes.json()]);
      if (!rulesRes.ok) throw new Error(rulesData?.error ?? "Failed to fetch approval rules");
      if (!usersRes.ok) throw new Error(usersData?.error ?? "Failed to fetch users");
      setRules(rulesData);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approval rules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleCreate(value: ApprovalRuleFormValue) {
    const response = await fetch("/api/approval-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? "Failed to create rule");
    setShowCreate(false);
    await fetchData();
  }

  async function handleActivate(ruleId: string, isActive: boolean) {
    setError(null);
    const response = await fetch(`/api/approval-rules/${ruleId}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data?.error ?? "Failed to update activation");
      return;
    }
    await fetchData();
  }

  async function handleDelete(ruleId: string) {
    setError(null);
    const response = await fetch(`/api/approval-rules/${ruleId}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error ?? "Failed to delete rule");
      return;
    }
    await fetchData();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Approval Rules</h1>
        <Button onClick={() => setShowCreate(true)}>New Rule</Button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted">Loading rules...</p>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-6 text-sm text-muted">
          No approval rules yet. Create one to get started.
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Flow</Th>
              <Th>Manager First</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {rules.map((rule) => (
              <Tr key={rule.id}>
                <Td>
                  <Link
                    className="font-medium hover:underline"
                    href={`/admin/approval-rules/${rule.id}`}
                  >
                    {rule.name}
                  </Link>
                </Td>
                <Td>{rule.ruleType}</Td>
                <Td>{rule.isSequential ? "Sequential" : "Parallel"}</Td>
                <Td>{rule.managerApproverFirst ? "Yes" : "No"}</Td>
                <Td>
                  {rule.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="default">Inactive</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-2">
                    {rule.isActive ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleActivate(rule.id, false)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleActivate(rule.id, true)}>
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(rule.id)}
                      disabled={rule.isActive}
                      title={rule.isActive ? "Deactivate before deleting" : "Delete rule"}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Approval Rule">
        <ApprovalRuleForm
          approvers={approvers}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitLabel="Create Rule"
        />
      </Modal>
    </div>
  );
}
