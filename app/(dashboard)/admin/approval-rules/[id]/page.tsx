"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApprovalRuleForm, type ApprovalRuleFormValue } from "@/components/approval/approval-rule-form";

interface RuleDetail {
  id: string;
  name: string;
  isActive: boolean;
  isSequential: boolean;
  managerApproverFirst: boolean;
  ruleType: "ALL" | "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID";
  percentageThreshold: number | null;
  specificApproverId: string | null;
  steps: Array<{ id: string; stepOrder: number; approverId: string; label: string }>;
}

interface UserOption {
  id: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

export default function ApprovalRuleDetailPage() {
  const params = useParams<{ id: string }>();
  const ruleId = params?.id;

  const [rule, setRule] = useState<RuleDetail | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const approvers = useMemo(
    () => users.filter((u) => u.role !== "EMPLOYEE").map((u) => ({ id: u.id, name: u.name })),
    [users]
  );

  const initialValue: ApprovalRuleFormValue | undefined = useMemo(() => {
    if (!rule) return undefined;
    return {
      name: rule.name,
      isActive: rule.isActive,
      isSequential: rule.isSequential,
      managerApproverFirst: rule.managerApproverFirst,
      ruleType: rule.ruleType,
      percentageThreshold: rule.percentageThreshold,
      specificApproverId: rule.specificApproverId,
      steps: rule.steps
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step) => ({ approverId: step.approverId, label: step.label })),
    };
  }, [rule]);

  const loadData = useCallback(async () => {
    if (!ruleId) return;

    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const [ruleRes, usersRes] = await Promise.all([
        fetch(`/api/approval-rules/${ruleId}`),
        fetch("/api/users"),
      ]);
      const [ruleData, usersData] = await Promise.all([ruleRes.json(), usersRes.json()]);

      if (!ruleRes.ok) throw new Error(ruleData?.error ?? "Failed to load rule");
      if (!usersRes.ok) throw new Error(usersData?.error ?? "Failed to load users");

      setRule(ruleData);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rule");
    } finally {
      setLoading(false);
    }
  }, [ruleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave(value: ApprovalRuleFormValue) {
    if (!ruleId) return;

    const response = await fetch(`/api/approval-rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? "Failed to save rule");
    }

    setRule(data);
    setSaved(true);
  }

  if (loading) return <p className="text-sm text-muted">Loading rule...</p>;

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/admin/approval-rules" className="text-sm text-secondary hover:underline">
          Back to rules
        </Link>
      </div>
    );
  }

  if (!initialValue) {
    return <p className="text-sm text-muted">Rule not found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link href="/admin/approval-rules" className="text-sm text-secondary hover:underline">
          Back to rules
        </Link>
        <h1 className="text-xl font-semibold text-text">Edit Rule</h1>
      </div>

      {saved ? <p className="text-sm text-success">Rule saved.</p> : null}

      <div className="rounded-lg border border-border bg-white p-4">
        <ApprovalRuleForm approvers={approvers} initialValue={initialValue} onSubmit={handleSave} />
      </div>
    </div>
  );
}
