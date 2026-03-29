"use client";

import { useState } from "react";
import { Button, Dropdown, Input } from "@/components/ui";

export interface ApprovalRuleFormValue {
	name: string;
	isActive: boolean;
	isSequential: boolean;
	managerApproverFirst: boolean;
	ruleType: "ALL" | "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID";
	percentageThreshold: number | null;
	specificApproverId: string | null;
	steps: Array<{ approverId: string; label: string }>;
}

interface ApprovalRuleFormProps {
	approvers: Array<{ id: string; name: string }>;
	initialValue?: Partial<ApprovalRuleFormValue>;
	onSubmit: (value: ApprovalRuleFormValue) => Promise<void>;
	onCancel: () => void;
	submitLabel?: string;
}

const RULE_TYPE_OPTIONS = [
	{ value: "ALL", label: "All approvers must approve" },
	{ value: "PERCENTAGE", label: "Minimum % threshold" },
	{ value: "SPECIFIC_APPROVER", label: "Specific approver" },
	{ value: "HYBRID", label: "Hybrid (% or specific approver)" },
];

function defaultStep() {
	return { approverId: "", label: "" };
}

export function ApprovalRuleForm({
	approvers,
	initialValue,
	onSubmit,
	onCancel,
	submitLabel = "Save",
}: ApprovalRuleFormProps) {
	const [name, setName] = useState(initialValue?.name ?? "");
	const [isActive, setIsActive] = useState(initialValue?.isActive ?? false);
	const [isSequential, setIsSequential] = useState(initialValue?.isSequential ?? false);
	const [managerApproverFirst, setManagerApproverFirst] = useState(
		initialValue?.managerApproverFirst ?? false
	);
	const [ruleType, setRuleType] = useState<ApprovalRuleFormValue["ruleType"]>(
		initialValue?.ruleType ?? "ALL"
	);
	const [percentageThreshold, setPercentageThreshold] = useState<number | "">(
		initialValue?.percentageThreshold ?? ""
	);
	const [specificApproverId, setSpecificApproverId] = useState<string>(
		initialValue?.specificApproverId ?? ""
	);
	const [steps, setSteps] = useState<Array<{ approverId: string; label: string }>>(
		initialValue?.steps?.map((s) => ({ approverId: s.approverId, label: s.label ?? "" })) ?? [
			defaultStep(),
		]
	);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	function addStep() {
		setSteps((prev) => [...prev, defaultStep()]);
	}

	function removeStep(index: number) {
		if (steps.length <= 1) return;
		setSteps((prev) => prev.filter((_, i) => i !== index));
	}

	function updateStep(index: number, field: "approverId" | "label", value: string) {
		setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);

		if (!name.trim()) {
			setError("Rule name is required.");
			return;
		}

		const needsSteps = steps.some((s) => s.approverId);
		const filledSteps = steps.filter((s) => s.approverId.trim());

		if (needsSteps && filledSteps.length !== steps.length) {
			setError("All step rows must have an approver selected, or remove empty rows.");
			return;
		}

		if (
			(ruleType === "PERCENTAGE" || ruleType === "HYBRID") &&
			(percentageThreshold === "" || Number(percentageThreshold) < 1 || Number(percentageThreshold) > 100)
		) {
			setError("Percentage threshold must be between 1 and 100.");
			return;
		}

		if (
			(ruleType === "SPECIFIC_APPROVER" || ruleType === "HYBRID") &&
			!specificApproverId
		) {
			setError("A specific approver must be selected for this rule type.");
			return;
		}

		if (
			(ruleType === "SPECIFIC_APPROVER" || ruleType === "HYBRID") &&
			specificApproverId &&
			!filledSteps.some((s) => s.approverId === specificApproverId)
		) {
			setError("The specific approver must also appear in the approvers list.");
			return;
		}

		const value: ApprovalRuleFormValue = {
			name: name.trim(),
			isActive,
			isSequential,
			managerApproverFirst,
			ruleType,
			percentageThreshold:
				ruleType === "PERCENTAGE" || ruleType === "HYBRID"
					? Number(percentageThreshold)
					: null,
			specificApproverId:
				ruleType === "SPECIFIC_APPROVER" || ruleType === "HYBRID"
					? specificApproverId || null
					: null,
			steps: filledSteps.map((s) => ({
				approverId: s.approverId,
				label: s.label.trim() || "",
			})),
		};

		setLoading(true);
		try {
			await onSubmit(value);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save rule.");
		} finally {
			setLoading(false);
		}
	}

	const showPercentage = ruleType === "PERCENTAGE" || ruleType === "HYBRID";
	const showSpecific = ruleType === "SPECIFIC_APPROVER" || ruleType === "HYBRID";

	return (
		<form className="space-y-5" onSubmit={handleSubmit}>
			<div className="space-y-1">
				<label className="text-sm font-medium text-text">Rule Name</label>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g. Finance + Manager"
					disabled={loading}
					required
				/>
			</div>

			<div className="space-y-1">
				<label className="text-sm font-medium text-text">Rule Type</label>
				<Dropdown
					options={RULE_TYPE_OPTIONS}
					value={ruleType}
					onChange={(e) => setRuleType(e.target.value as ApprovalRuleFormValue["ruleType"])}
					disabled={loading}
				/>
			</div>

			{showPercentage && (
				<div className="space-y-1">
					<label className="text-sm font-medium text-text">Minimum Approval % (1–100)</label>
					<Input
						type="number"
						min={1}
						max={100}
						value={percentageThreshold}
						onChange={(e) =>
							setPercentageThreshold(e.target.value === "" ? "" : Number(e.target.value))
						}
						placeholder="e.g. 60"
						disabled={loading}
					/>
				</div>
			)}

			{showSpecific && (
				<div className="space-y-1">
					<label className="text-sm font-medium text-text">Specific Required Approver</label>
					<Dropdown
						options={[
							{ value: "", label: "— Select approver —" },
							...approvers.map((a) => ({ value: a.id, label: a.name })),
						]}
						value={specificApproverId}
						onChange={(e) => setSpecificApproverId(e.target.value)}
						disabled={loading}
					/>
				</div>
			)}

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<label className="text-sm font-medium text-text">Approvers</label>
					<Button type="button" size="sm" variant="secondary" onClick={addStep} disabled={loading}>
						+ Add Approver
					</Button>
				</div>
				{steps.map((step, index) => (
					<div key={index} className="flex gap-2">
						<Dropdown
							className="flex-1"
							options={[
								{ value: "", label: "— Select approver —" },
								...approvers.map((a) => ({ value: a.id, label: a.name })),
							]}
							value={step.approverId}
							onChange={(e) => updateStep(index, "approverId", e.target.value)}
							disabled={loading}
						/>
						<Input
							className="flex-1"
							placeholder={`Step ${index + 1} label (optional)`}
							value={step.label}
							onChange={(e) => updateStep(index, "label", e.target.value)}
							disabled={loading}
						/>
						<Button
							type="button"
							size="sm"
							variant="danger"
							onClick={() => removeStep(index)}
							disabled={loading || steps.length <= 1}
						>
							✕
						</Button>
					</div>
				))}
			</div>

			<div className="space-y-2 rounded-lg border border-border bg-primary p-3">
				<label className="flex cursor-pointer items-center gap-2 text-sm text-text">
					<input
						type="checkbox"
						checked={managerApproverFirst}
						onChange={(e) => setManagerApproverFirst(e.target.checked)}
						disabled={loading}
						className="h-4 w-4 accent-secondary"
					/>
					Manager is an approver (routes to employee&apos;s manager first)
				</label>
				<label className="flex cursor-pointer items-center gap-2 text-sm text-text">
					<input
						type="checkbox"
						checked={isSequential}
						onChange={(e) => setIsSequential(e.target.checked)}
						disabled={loading}
						className="h-4 w-4 accent-secondary"
					/>
					Sequential approvals (one by one in order)
				</label>
				<label className="flex cursor-pointer items-center gap-2 text-sm text-text">
					<input
						type="checkbox"
						checked={isActive}
						onChange={(e) => setIsActive(e.target.checked)}
						disabled={loading}
						className="h-4 w-4 accent-secondary"
					/>
					Set as active rule (deactivates any currently active rule)
				</label>
			</div>

			{error ? <p className="text-sm text-danger">{error}</p> : null}

			<div className="flex justify-end gap-2">
				<Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
					Cancel
				</Button>
				<Button type="submit" disabled={loading}>
					{loading ? "Saving..." : submitLabel}
				</Button>
			</div>
		</form>
	);
}
