"use client";

import { Badge, Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface ApprovalLogEntry {
	id: string;
	approverName: string;
	status: "PENDING" | "APPROVED" | "REJECTED";
	comment: string | null;
	decidedAt: string | null;
	isManagerApproval?: boolean;
}

interface ApprovalLogProps {
	items: ApprovalLogEntry[];
}

function statusBadge(status: ApprovalLogEntry["status"]) {
	if (status === "APPROVED") return <Badge variant="success">Approved</Badge>;
	if (status === "REJECTED") return <Badge variant="danger">Rejected</Badge>;
	return <Badge variant="warning">Pending</Badge>;
}

export function ApprovalLog({ items }: ApprovalLogProps) {
	if (!items.length) {
		return (
			<div className="rounded-lg border border-border bg-white p-4 text-sm text-muted">
				No approval history yet.
			</div>
		);
	}

	return (
		<Table>
			<Thead>
				<tr>
					<Th>Approver</Th>
					<Th>Status</Th>
					<Th>Comment</Th>
					<Th>Time</Th>
				</tr>
			</Thead>
			<Tbody>
				{items.map((item) => (
					<Tr key={item.id}>
						<Td>
							<div className="font-medium text-text">{item.approverName}</div>
							{item.isManagerApproval ? (
								<div className="text-xs text-muted">Manager step</div>
							) : null}
						</Td>
						<Td>{statusBadge(item.status)}</Td>
						<Td className="max-w-[320px] text-muted">
							{item.comment?.trim() ? item.comment : "-"}
						</Td>
						<Td className="text-muted">
							{item.decidedAt ? formatDate(item.decidedAt) : "-"}
						</Td>
					</Tr>
				))}
			</Tbody>
		</Table>
	);
}
