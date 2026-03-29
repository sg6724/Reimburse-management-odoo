export type WorkflowRuleType = "ALL" | "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID";
export type ApprovalDecision = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalWorkflow {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  isSequential: boolean;
  managerApproverFirst: boolean;
  ruleType: WorkflowRuleType;
  percentageThreshold: number | null;
  specificApproverId: string | null;
  createdAt: string;
}

export interface ApprovalWorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  approverId: string;
  label: string;
  approver?: { id: string; name: string };
}

export interface ExpenseApproval {
  id: string;
  expenseId: string;
  workflowStepId: string | null;
  approverId: string;
  status: ApprovalDecision;
  comment: string | null;
  isManagerApproval: boolean;
  createdAt: string;
  decidedAt: string | null;
  approver?: { id: string; name: string };
}
