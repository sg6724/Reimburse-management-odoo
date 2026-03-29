"use client";

import Link from "next/link";
import { Badge, Button, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { ApprovalQueueItem } from "@/hooks/use-approvals";

interface ApprovalTableProps {
	approvals: ApprovalQueueItem[];
	onApprove: (approvalId: string) => void;
	onReject: (approvalId: string) => void;
}

function decisionBadge(status: ApprovalQueueItem["status"]) {
	if (status === "APPROVED") return <Badge variant="success">Approved</Badge>;
	if (status === "REJECTED") return <Badge variant="danger">Rejected</Badge>;
	return <Badge variant="warning">Pending</Badge>;
}

function expenseStatusBadge(status: ApprovalQueueItem["expense"]["status"]) {
	if (status === "APPROVED") return <Badge variant="success">Approved</Badge>;
	if (status === "REJECTED") return <Badge variant="danger">Rejected</Badge>;
	if (status === "PENDING") return <Badge variant="warning">Waiting Approval</Badge>;
	return <Badge variant="default">Draft</Badge>;
}

export function ApprovalTable({ approvals, onApprove, onReject }: ApprovalTableProps) {
	if (approvals.length === 0) {
		return (
			<div className="rounded-lg border border-border bg-white p-6 text-sm text-muted">
				No approvals assigned yet.
			</div>
		);
	}

	return (
		<Table>
			<Thead>
				<tr>
					<Th>Approval Subject</Th>
					<Th>Request Owner</Th>
					<Th>Category</Th>
					<Th>Request Status</Th>
					<Th>Total Amount (Base)</Th>
					<Th>Your Decision</Th>
					<Th>Action</Th>
				</tr>
			</Thead>
			<Tbody>
				{approvals.map((item) => (
					<Tr key={item.id}>
						<Td>
							<Link href={`/manager/approvals/${item.id}`} className="font-medium hover:underline">
								{item.expense.title}
							</Link>
						</Td>
						<Td>{item.expense.employee.name}</Td>
						<Td>{item.expense.category.name}</Td>
						<Td>{expenseStatusBadge(item.expense.status)}</Td>
						<Td>
							{formatCurrency(
								item.expense.amountInCompanyCurrency,
								item.expense.company.currencyCode
							)}
						</Td>
						<Td>{decisionBadge(item.status)}</Td>
						<Td>
							{item.canAct && item.status === "PENDING" ? (
								<div className="flex gap-2">
									<Button size="sm" onClick={() => onApprove(item.id)}>
										Approve
									</Button>
									<Button size="sm" variant="danger" onClick={() => onReject(item.id)}>
										Reject
									</Button>
								</div>
							) : (
								<span className="text-xs text-muted">Read-only</span>
							)}
						</Td>
					</Tr>
				))}
			</Tbody>
		</Table>
	);
}
