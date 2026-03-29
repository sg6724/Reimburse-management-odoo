"use client";

import { useMemo, useState } from "react";
import { Button, Dropdown, Input } from "@/components/ui";

type RuleType = "ALL" | "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID";

interface RuleStepInput {
	approverId: string;
	label: string;
}

export interface ApprovalRuleFormValue {
	name: string;
	isActive: boolean;
	isSequential: boolean;
	managerApproverFirst: boolean;
	ruleType: RuleType;
	percentageThreshold: number | null;
	specificApproverId: string | null;
	steps: RuleStepInput[];
}

interface ApprovalRuleFormProps {
	approvers: Array<{ id: string; name: string }>;
	initialValue?: ApprovalRuleFormValue;
	submitLabel?: string;
	onSubmit: (value: ApprovalRuleFormValue) => Promise<void> | void;
	onCancel?: () => void;
}

const emptyRule: ApprovalRuleFormValue = {
	name: "",
	isActive: false,
	isSequential: false,
	managerApproverFirst: true,
	ruleType: "ALL",
	percentageThreshold: null,
	specificApproverId: null,
	steps: [{ approverId: "", label: "Step 1" }],
};

export function ApprovalRuleForm({
	approvers,
	initialValue,
	submitLabel = "Save Rule",
	onSubmit,
	onCancel,
}: ApprovalRuleFormProps) {
	const [form, setForm] = useState<ApprovalRuleFormValue>(initialValue ?? emptyRule);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const approverOptions = useMemo(
		() => approvers.map((user) => ({ value: user.id, label: user.name })),
		[approvers]
	);

	function updateStep(index: number, patch: Partial<RuleStepInput>) {
		setForm((prev) => ({
			...prev,
			steps: prev.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
		}));
	}

	function addStep() {
		setForm((prev) => ({
			...prev,
			steps: [...prev.steps, { approverId: "", label: `Step ${prev.steps.length + 1}` }],
		}));
	}

	function removeStep(index: number) {
		setForm((prev) => {
			if (prev.steps.length <= 1) return prev;
			const steps = prev.steps.filter((_, i) => i !== index);
			return {
				...prev,
				steps: steps.map((step, idx) => ({ ...step, label: step.label || `Step ${idx + 1}` })),
			};
		});
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);

		const cleanedSteps = form.steps
			.map((step, index) => ({
				approverId: step.approverId,
				label: step.label.trim() || `Step ${index + 1}`,
			}))
			.filter((step) => step.approverId);

		if (!form.name.trim()) {
			setError("Rule name is required.");
			return;
		}

		if (cleanedSteps.length === 0 && !form.managerApproverFirst) {
			setError("Add at least one approver step or enable manager-first.");
			return;
		}

		if ((form.ruleType === "PERCENTAGE" || form.ruleType === "HYBRID") && !form.percentageThreshold) {
			setError("Percentage threshold is required for percentage and hybrid rules.");
			return;
		}

		if ((form.ruleType === "SPECIFIC_APPROVER" || form.ruleType === "HYBRID") && !form.specificApproverId) {
			setError("Specific approver is required for specific and hybrid rules.");
			return;
		}

		setSubmitting(true);
		try {
			await onSubmit({
				...form,
				name: form.name.trim(),
				percentageThreshold:
					form.ruleType === "PERCENTAGE" || form.ruleType === "HYBRID"
						? form.percentageThreshold
						: null,
				specificApproverId:
					form.ruleType === "SPECIFIC_APPROVER" || form.ruleType === "HYBRID"
						? form.specificApproverId
						: null,
				steps: cleanedSteps,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save rule");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			<Input
				id="rule-name"
				label="Rule name"
				value={form.name}
				onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
				required
			/>

			<Dropdown
				id="rule-type"
				label="Rule type"
				options={[
					{ value: "ALL", label: "All approvers" },
					{ value: "PERCENTAGE", label: "Percentage threshold" },
					{ value: "SPECIFIC_APPROVER", label: "Specific approver" },
					{ value: "HYBRID", label: "Hybrid" },
				]}
				value={form.ruleType}
				onChange={(e) => setForm((prev) => ({ ...prev, ruleType: e.target.value as RuleType }))}
			/>

			{(form.ruleType === "PERCENTAGE" || form.ruleType === "HYBRID") && (
				<Input
					id="threshold"
					type="number"
					min={1}
					max={100}
					label="Minimum approval %"
					value={form.percentageThreshold ?? ""}
					onChange={(e) =>
						setForm((prev) => ({
							...prev,
							percentageThreshold: e.target.value ? Number(e.target.value) : null,
						}))
					}
					required
				/>
			)}

			{(form.ruleType === "SPECIFIC_APPROVER" || form.ruleType === "HYBRID") && (
				<Dropdown
					id="specific-approver"
					label="Specific approver"
					options={approverOptions}
					value={form.specificApproverId ?? ""}
					onChange={(e) =>
						setForm((prev) => ({ ...prev, specificApproverId: e.target.value || null }))
					}
					placeholder="Select approver"
					required
				/>
			)}

			<div className="grid grid-cols-1 gap-2 text-sm text-text md:grid-cols-3">
				<label className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
					<input
						type="checkbox"
						checked={form.managerApproverFirst}
						onChange={(e) =>
							setForm((prev) => ({ ...prev, managerApproverFirst: e.target.checked }))
						}
					/>
					Manager first
				</label>
				<label className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
					<input
						type="checkbox"
						checked={form.isSequential}
						onChange={(e) => setForm((prev) => ({ ...prev, isSequential: e.target.checked }))}
					/>
					Sequential flow
				</label>
				<label className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
					<input
						type="checkbox"
						checked={form.isActive}
						onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
					/>
					Activate now
				</label>
			</div>

			<div className="space-y-3 rounded-lg border border-border bg-white p-4">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold text-text">Approver steps</h3>
					<Button type="button" size="sm" variant="secondary" onClick={addStep}>
						Add step
					</Button>
				</div>

				{form.steps.map((step, index) => (
					<div key={`${index}-${step.label}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
						<Dropdown
							options={approverOptions}
							value={step.approverId}
							onChange={(e) => updateStep(index, { approverId: e.target.value })}
							placeholder="Select approver"
							required
						/>
						<Input
							value={step.label}
							onChange={(e) => updateStep(index, { label: e.target.value })}
							placeholder={`Step ${index + 1}`}
						/>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => removeStep(index)}
							disabled={form.steps.length <= 1}
						>
							Remove
						</Button>
					</div>
				))}
			</div>

			{error ? <p className="text-sm text-danger">{error}</p> : null}

			<div className="flex justify-end gap-2">
				{onCancel ? (
					<Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
						Cancel
					</Button>
				) : null}
				<Button type="submit" disabled={submitting}>
					{submitting ? "Saving..." : submitLabel}
				</Button>
			</div>
		</form>
	);
}
