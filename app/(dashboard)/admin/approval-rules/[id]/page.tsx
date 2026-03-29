"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ApprovalRuleForm, type ApprovalRuleFormValue } from "@/components/approval/approval-rule-form";

interface UserOption {
  id: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

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

export default function ApprovalRuleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ruleId = params?.id;

  const [rule, setRule] = useState<WorkflowRule | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const approvers = useMemo(
    () => users.filter((u) => u.role !== "EMPLOYEE").map((u) => ({ id: u.id, name: u.name })),
    [users]
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [ruleRes, usersRes] = await Promise.all([
          fetch(`/api/approval-rules/${ruleId}`),
          fetch("/api/users"),
        ]);
        const [ruleData, usersData] = await Promise.all([ruleRes.json(), usersRes.json()]);
        if (!ruleRes.ok) throw new Error(ruleData?.error ?? "Failed to fetch rule");
        if (!usersRes.ok) throw new Error(usersData?.error ?? "Failed to fetch users");
        setRule(ruleData);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (ruleId) loadData();
  }, [ruleId]);

  async function handleSave(value: ApprovalRuleFormValue) {
    const response = await fetch(`/api/approval-rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? "Failed to save rule");
    setRule(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <p className="text-sm text-muted">Loading rule...</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!rule) return <p className="text-sm text-muted">Rule not found.</p>;

  const initialValue: ApprovalRuleFormValue = {
    name: rule.name,
    isActive: rule.isActive,
    isSequential: rule.isSequential,
    managerApproverFirst: rule.managerApproverFirst,
    ruleType: rule.ruleType,
    percentageThreshold: rule.percentageThreshold,
    specificApproverId: rule.specificApproverId,
    steps: rule.steps
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s) => ({ approverId: s.approver.id, label: s.label })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{rule.name}</h1>
          <Link href="/admin/approval-rules" className="text-sm text-secondary hover:underline">
            ← Back to rules
          </Link>
        </div>
      </div>

      {saved ? (
        <p className="text-sm text-success">Rule saved successfully.</p>
      ) : null}

      <div className="rounded-lg border border-border bg-white p-5">
        <ApprovalRuleForm
          approvers={approvers}
          initialValue={initialValue}
          onSubmit={handleSave}
          onCancel={() => router.push("/admin/approval-rules")}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
