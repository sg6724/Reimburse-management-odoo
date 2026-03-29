"use client";

import { useCallback, useEffect, useState } from "react";

export interface ApprovalQueueItem {
	id: string;
	approver: { id: string; name: string };
	status: "PENDING" | "APPROVED" | "REJECTED";
	comment: string | null;
	decidedAt: string | null;
	createdAt: string;
	canAct: boolean;
	isManagerApproval: boolean;
	expense: {
		id: string;
		title: string;
		status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
		amount: number;
		amountInCompanyCurrency: number;
		currencyCode: string;
		employee: { id: string; name: string; email: string };
		category: { id: string; name: string };
		company: { currencyCode: string };
	};
}

export function useApprovals() {
	const [approvals, setApprovals] = useState<ApprovalQueueItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refetch = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/approvals", { cache: "no-store" });
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.error ?? "Failed to fetch approvals");
			}

			setApprovals(data);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to fetch approvals";
			setError(message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refetch();
	}, [refetch]);

	async function approve(approvalId: string, comment?: string) {
		const response = await fetch(`/api/approvals/${approvalId}/approve`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ comment: comment?.trim() || undefined }),
		});

		const data = await response.json();
		if (!response.ok) throw new Error(data?.error ?? "Failed to approve");

		await refetch();
		return data;
	}

	async function reject(approvalId: string, comment: string) {
		const response = await fetch(`/api/approvals/${approvalId}/reject`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ comment: comment.trim() }),
		});

		const data = await response.json();
		if (!response.ok) throw new Error(data?.error ?? "Failed to reject");

		await refetch();
		return data;
	}

	return {
		approvals,
		loading,
		error,
		refetch,
		approve,
		reject,
	};
}
