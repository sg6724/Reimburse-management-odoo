"use client";

import { useMemo, useState } from "react";
import { ApprovalTable } from "@/components/approval/approval-table";
import { RejectModal } from "@/components/approval/reject-modal";
import { Button, Dropdown } from "@/components/ui";
import { useApprovals } from "@/hooks/use-approvals";

export default function ApprovalsPage() {
  const { approvals, loading, error, approve, reject, refetch } = useApprovals();
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  const filteredApprovals = useMemo(() => {
    if (filter === "ALL") return approvals;
    return approvals.filter((item) => item.status === filter);
  }, [approvals, filter]);

  async function handleApprove(approvalId: string) {
    setDecisionError(null);
    setActionLoading(true);
    try {
      await approve(approvalId);
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(comment: string) {
    if (!rejectTarget) return;
    setDecisionError(null);
    setActionLoading(true);
    try {
      await reject(rejectTarget, comment);
      setRejectTarget(null);
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-text">Approvals to Review</h1>
        <div className="flex items-center gap-2">
          <Dropdown
            options={[
              { value: "ALL", label: "All" },
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ]}
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="w-40"
          />
          <Button variant="secondary" onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {decisionError ? <p className="text-sm text-danger">{decisionError}</p> : null}

      {loading ? (
        <p className="text-sm text-muted">Loading approvals...</p>
      ) : (
        <ApprovalTable
          approvals={filteredApprovals}
          onApprove={handleApprove}
          onReject={setRejectTarget}
        />
      )}

      <RejectModal
        open={Boolean(rejectTarget)}
        loading={actionLoading}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleReject}
      />
    </div>
  );
}
