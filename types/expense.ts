export type ExpenseStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

export interface Expense {
  id: string;
  companyId: string;
  employeeId: string;
  title: string;
  amount: number;
  currencyCode: string;
  amountInCompanyCurrency: number;
  categoryId: string;
  description: string | null;
  paidById: string | null;
  remarks: string | null;
  date: string;
  status: ExpenseStatus;
  receiptUrl: string | null;
  workflowId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseWithRelations extends Expense {
  employee: { id: string; name: string };
  category: { id: string; name: string };
  paidBy: { id: string; name: string } | null;
  approvals: import("./approval").ExpenseApproval[];
}

export interface ExpenseCategory {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
}
