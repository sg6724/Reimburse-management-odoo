"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApprovalLog } from "@/components/approval/approval-log";
import { RejectModal } from "@/components/approval/reject-modal";
import { Badge, Button } from "@/components/ui";
import { useApprovals } from "@/hooks/use-approvals";
import { formatCurrency } from "@/lib/utils";

function statusBadge(status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") return <Badge variant="success">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="danger">Rejected</Badge>;
  if (status === "PENDING") return <Badge variant="warning">Waiting Approval</Badge>;
  return <Badge variant="default">Draft</Badge>;
}

export default function ApprovalDetailPage() {
  const params = useParams<{ id: string }>();
  const approvalId = params?.id;

  const { approvals, loading, error, approve, reject } = useApprovals();
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const current = useMemo(
    () => approvals.find((item) => item.id === approvalId),
    [approvals, approvalId]
  );

  async function handleApprove() {
    if (!approvalId) return;
    setDecisionError(null);
    setSubmitting(true);
    try {
      await approve(approvalId);
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(comment: string) {
    if (!approvalId) return;
    setDecisionError(null);
    setSubmitting(true);
    try {
      await reject(approvalId, comment);
      setShowReject(false);
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading approval...</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!current) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Approval not found.</p>
        <Link href="/manager/approvals" className="text-sm text-secondary hover:underline">
          Back to approvals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{current.expense.title}</h1>
          <p className="text-sm text-muted">Request Owner: {current.expense.employee.name}</p>
        </div>
        {statusBadge(current.expense.status)}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-muted">Category</p>
          <p className="text-sm text-text">{current.expense.category.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Total Amount (Base Currency)</p>
          <p className="text-sm text-text">
            {formatCurrency(
              current.expense.amountInCompanyCurrency,
              current.expense.company.currencyCode
            )}
          </p>
        </div>
      </div>

      {decisionError ? <p className="text-sm text-danger">{decisionError}</p> : null}

      <div className="flex gap-2">
        <Link
          href="/manager/approvals"
          className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-primary"
        >
          Back
        </Link>
        {current.canAct && current.status === "PENDING" ? (
          <>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting ? "Saving..." : "Approve"}
            </Button>
            <Button variant="danger" onClick={() => setShowReject(true)} disabled={submitting}>
              Reject
            </Button>
          </>
        ) : (
          <p className="self-center text-sm text-muted">This row is read-only.</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text">Approval Log</h2>
        <ApprovalLog
          items={approvals
            .filter((item) => item.expense.id === current.expense.id)
            .map((item) => ({
              id: item.id,
              approverName: item.approver.name,
              status: item.status,
              comment: item.comment,
              decidedAt: item.decidedAt,
              isManagerApproval: item.isManagerApproval,
            }))}
        />
      </div>

      <RejectModal
        open={showReject}
        loading={submitting}
        onClose={() => setShowReject(false)}
        onSubmit={handleReject}
      />
    </div>
  );
}
