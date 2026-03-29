"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";

interface RejectModalProps {
	open: boolean;
	loading?: boolean;
	onClose: () => void;
	onSubmit: (comment: string) => Promise<void> | void;
}

export function RejectModal({ open, loading, onClose, onSubmit }: RejectModalProps) {
	const [comment, setComment] = useState("");
	const [error, setError] = useState<string | null>(null);

	function handleClose() {
		setComment("");
		setError(null);
		onClose();
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const trimmed = comment.trim();
		if (!trimmed) {
			setError("Rejection comment is required.");
			return;
		}

		setError(null);
		await onSubmit(trimmed);
	}

	return (
		<Modal open={open} onClose={handleClose} title="Reject Approval">
			<form className="space-y-4" onSubmit={handleSubmit}>
				<div className="space-y-1">
					<label htmlFor="reject-comment" className="text-sm font-medium text-text">
						Rejection reason
					</label>
					<textarea
						id="reject-comment"
						className="min-h-28 w-full rounded-md border border-border px-3 py-2 text-sm text-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary"
						placeholder="Explain why this expense is being rejected"
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						disabled={loading}
						required
					/>
					{error ? <p className="text-xs text-danger">{error}</p> : null}
				</div>

				<div className="flex justify-end gap-2">
					<Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" variant="danger" disabled={loading}>
						{loading ? "Rejecting..." : "Reject"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
