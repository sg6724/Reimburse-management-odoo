# Database Schema — Reimbursement Management SaaS

> **Stack:** Prisma ORM + SQLite
> **Total Tables:** 7 models + 4 enums

---

## Enums

| Enum | Values | Used In |
|------|--------|---------|
| `Role` | `ADMIN`, `MANAGER`, `EMPLOYEE` | `User.role` |
| `ExpenseStatus` | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED` | `Expense.status` |
| `WorkflowRuleType` | `ALL`, `PERCENTAGE`, `SPECIFIC_APPROVER`, `HYBRID` | `ApprovalWorkflow.ruleType` |

> **Note on `WorkflowRuleType` vs `isSequential`:** These are two independent axes. `isSequential` controls *when* approvers are notified (one-by-one vs all at once). `ruleType` controls *what condition* resolves the workflow (all must approve, a threshold, a specific person, or a hybrid). A workflow can be sequential AND percentage-based, or parallel AND require a specific approver — all four combinations are valid.
| `ApprovalDecision` | `PENDING`, `APPROVED`, `REJECTED` | `ExpenseApproval.status` |

---

## Table 1 — `Company`

**Purpose:** Represents a tenant. Auto-created when the first admin signs up. All data in the system is scoped to a company via `companyId`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `name` | String | Company name entered at signup |
| `country` | String | Country selected at signup (e.g. `"India"`) |
| `currencyCode` | String | Currency resolved from country at signup via restcountries API (e.g. `"INR"`). Stored once, used as the base currency for all expense conversions. |
| `createdAt` | DateTime | Auto-set on creation |

**Relations:**
- Has many `User`
- Has many `ExpenseCategory`
- Has many `Expense`
- Has many `ApprovalWorkflow`

---

## Table 2 — `User`

**Purpose:** Single table for all three roles — Admin, Manager, and Employee. Each person is one row, distinguished by the `role` field. Handles credentials, role assignment, manager relationships, and password reset state.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `companyId` | String | FK → `Company.id`. Scopes user to a tenant. |
| `name` | String | Full name |
| `email` | String (unique) | Login identifier. Unique across the entire system. |
| `passwordHash` | String | bcrypt hash of the user's password |
| `role` | `Role` enum | `ADMIN`, `MANAGER`, or `EMPLOYEE`. Determines permissions and UI access. |
| `managerId` | String? (nullable) | FK → `User.id` (self-referential). Set on EMPLOYEE rows to point to their assigned manager. Null for ADMIN and MANAGER rows. |
| `mustChangePassword` | Boolean | Default `false`. Set to `true` by Admin when resetting a forgotten password. Forces the user to set a new password on next login before accessing anything else. |
| `createdAt` | DateTime | Auto-set on creation |

**Relations:**
- Belongs to `Company`
- Self-referential: `manager` (User → User via `managerId`) and `directReports` (reverse)
- Has many `Expense` (as employee who submitted)
- Has many `ApprovalWorkflowStep` (as an approver in workflow steps)
- Referenced by `ApprovalWorkflow.specificApproverId`
- Has many `ExpenseApproval` (approval decisions made by this user)

**Role-specific field usage:**

| Field | ADMIN | MANAGER | EMPLOYEE |
|-------|-------|---------|----------|
| `managerId` | null | null | set to a Manager's id |
| `mustChangePassword` | applicable | applicable | applicable |

---

## Table 3 — `ExpenseCategory`

**Purpose:** Lookup table of expense categories per company (e.g. Travel, Food, Equipment). Admin manages these. Employees pick from these when submitting an expense.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `companyId` | String | FK → `Company.id`. Categories are company-specific. |
| `name` | String | Category label (e.g. `"Travel"`, `"Meals"`) |
| `isActive` | Boolean | Default `true`. Set to `false` to soft-disable a category. Categories with existing expenses must be soft-disabled rather than hard-deleted, preserving historical records. Hidden from the employee submission form when `false`. |
| `createdAt` | DateTime | Auto-set on creation |

**Relations:**
- Belongs to `Company`
- Has many `Expense`

---

## Table 4 — `Expense`

**Purpose:** The core entity. Stores every expense claim submitted by an employee. Covers the full lifecycle from draft to final decision. Drafts are just rows with `status = DRAFT` — no separate table needed.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `companyId` | String | FK → `Company.id` |
| `employeeId` | String | FK → `User.id`. The employee who submitted this expense. |
| `title` | String | Short title of the expense (e.g. `"Client dinner - Mumbai"`) |
| `amount` | Float | Amount in the currency the employee entered (e.g. `500`) |
| `currencyCode` | String | Currency the employee entered (e.g. `"EUR"`). May differ from company currency. |
| `amountInCompanyCurrency` | Float | Amount converted to company's default currency at submission time. Stored permanently — never recalculated (preserves historical FX rate). |
| `categoryId` | String | FK → `ExpenseCategory.id` |
| `description` | String? | Optional notes about the expense |
| `paidById` | String? | FK → `User.id`. The person who physically paid (may differ from the submitting employee). Nullable — employee may leave blank. |
| `remarks` | String? | Optional free-text remarks from the employee (e.g. "client dinner before product demo"). |
| `date` | DateTime | Date the expense was incurred |
| `status` | `ExpenseStatus` | `DRAFT` → saved but not submitted. `PENDING` → in approval flow. `APPROVED` / `REJECTED` → final states. |
| `receiptUrl` | String? | Path or URL to the uploaded receipt image (set after OCR upload) |
| `workflowId` | String? | FK → `ApprovalWorkflow.id`. Captured at submission time so the expense always references the workflow that was active when it was submitted, even if admin later changes the active workflow. Null for DRAFT and manager-bypass expenses. |
| `createdAt` | DateTime | Auto-set on creation |
| `updatedAt` | DateTime | Auto-updated on every save |

**Indexes:** `companyId`, `employeeId`, `status` (for fast filtered queries)

**Relations:**
- Belongs to `Company`, `User` (employee), `ExpenseCategory`
- Optionally belongs to `User` (paidBy)
- Has many `ExpenseApproval`

---

## Table 5 — `ApprovalWorkflow`

**Purpose:** Defines the approval configuration for a company. Admin creates and manages these. Only one workflow can be `isActive = true` per company at a time. Contains the rule type that determines how approval is evaluated.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `companyId` | String | FK → `Company.id` |
| `name` | String | Workflow name (e.g. `"Standard Approval Flow"`) |
| `isActive` | Boolean | Default `false`. Only one workflow per company should be `true`. When this is set to `true`, all others in the company are set to `false`. |
| `isSequential` | Boolean | Default `false`. Controls the **order axis** of the approval flow — independent of the conditional logic in `ruleType`. If `true`, approvers are notified one at a time in `stepOrder` sequence; the next approver is only notified after the current one acts. If `false`, all approvers are notified simultaneously (parallel), and the workflow resolves based on `ruleType` thresholds. |
| `managerApproverFirst` | Boolean | Default `false`. If `true`, the expense is routed to the employee's direct manager (`User.managerId`) as the very first step, before any `ApprovalWorkflowStep` entries are processed. The manager approval is recorded as an `ExpenseApproval` row with `isManagerApproval = true`. |
| `ruleType` | `WorkflowRuleType` | Determines how the workflow **resolves** once approvals start coming in. `ALL` = every step must approve. `PERCENTAGE` = resolves when `percentageThreshold` % of approvers approve. `SPECIFIC_APPROVER` = resolves the moment `specificApproverId` approves, regardless of others. `HYBRID` = resolves on whichever fires first — `PERCENTAGE` threshold OR `specificApproverId` approval. |
| `percentageThreshold` | Int? | Only used when `ruleType = PERCENTAGE` or `HYBRID`. e.g. `60` means 60% of steps must approve. |
| `specificApproverId` | String? | FK → `User.id`. Only used when `ruleType = SPECIFIC_APPROVER` or `HYBRID`. Points to the user (e.g. CFO) whose approval alone resolves the workflow. |
| `createdAt` | DateTime | Auto-set on creation |

**Relations:**
- Belongs to `Company`
- Optionally references a `User` as `specificApprover`
- Has many `ApprovalWorkflowStep`

---

## Table 6 — `ApprovalWorkflowStep`

**Purpose:** Defines the ordered list of approvers within a workflow. Admin adds steps and sets their order. Each step points to one user (Manager or Admin) who must act on the expense at that position in the sequence.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `workflowId` | String | FK → `ApprovalWorkflow.id` |
| `stepOrder` | Int | Position in the sequence (1 = first, 2 = second, etc.). Admin sets this when building the workflow. |
| `approverId` | String | FK → `User.id`. The manager or admin responsible for approving at this step. Selected from a dropdown of MANAGER/ADMIN users. |
| `label` | String | Human-readable label for this step (e.g. `"Manager"`, `"Finance"`, `"Director"`) |

**Relations:**
- Belongs to `ApprovalWorkflow`
- References a `User` as the approver
- Has many `ExpenseApproval` (the actual decisions made at this step)

---

## Table 7 — `ExpenseApproval`

**Purpose:** Records every individual approval action on an expense. One row is created per approval request (not all at once — created one step at a time as the workflow advances). This table is the audit trail for all decisions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `expenseId` | String | FK → `Expense.id` |
| `workflowStepId` | String? | FK → `ApprovalWorkflowStep.id`. **Null** when `isManagerApproval = true` (manager-bypass path has no workflow step). |
| `approverId` | String | FK → `User.id`. The specific person who needs to (or did) act on this request. |
| `status` | `ApprovalDecision` | `PENDING` → waiting for decision. `APPROVED` / `REJECTED` → decision made. |
| `comment` | String? | Optional comment left by the approver when approving or rejecting. |
| `isManagerApproval` | Boolean | Default `false`. Set to `true` when the expense was routed via the manager-bypass path (employee's manager has `isManagerApprover = true`). Distinguishes bypass records from workflow step records. |
| `createdAt` | DateTime | When this approval request was created (i.e. when the previous step approved and triggered this one) |
| `decidedAt` | DateTime? | When the approver made their decision. Null while still PENDING. |

**Indexes:** `expenseId`, `approverId` (for fast lookup of "all pending approvals for this approver")

**Relations:**
- Belongs to `Expense`
- Optionally belongs to `ApprovalWorkflowStep`
- Belongs to `User` (approver)

---

## Relationships Diagram

```
Company
  ├── User (many)
  │     ├── self-ref: managerId → User (manager)
  │     └── self-ref: directReports ← User[] (employees)
  ├── ExpenseCategory (many)
  ├── Expense (many)
  │     ├── employeeId → User
  │     ├── paidById → User (nullable)
  │     ├── categoryId → ExpenseCategory
  │     ├── workflowId → ApprovalWorkflow (nullable)
  │     └── ExpenseApproval (many)
  │           ├── approverId → User
  │           └── workflowStepId → ApprovalWorkflowStep (nullable)
  └── ApprovalWorkflow (many)
        ├── specificApproverId → User (nullable)
        └── ApprovalWorkflowStep (many)
              └── approverId → User
```

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Single `User` table for all roles | All roles share credentials. Role is just a filter. Avoids complex joins for auth. |
| `amountInCompanyCurrency` stored at submission | FX rates change daily. Storing at submission time preserves the historical rate. |
| `workflowId` on `Expense` | Captures which workflow was active at submission. Admin can change active workflow without affecting in-progress expenses. |
| `mustChangePassword` on `User` | Supports admin-driven password reset without email infrastructure. Forces password change on next login. |
| `isManagerApproval` on `ExpenseApproval` | Cleanly separates bypass-path records from workflow-path records without needing a union query. |
| `workflowStepId` nullable on `ExpenseApproval` | Manager-bypass approvals have no associated workflow step. Null = bypass path. |
| One active workflow per company | Enforced at app layer: setting a workflow to `isActive = true` sets all others to `false` in a transaction. |
| `managerApproverFirst` on `ApprovalWorkflow` (not `User`) | Manager-first routing is a property of the rule, not a permanent trait of a person. A different rule may not require it, and baking it onto `User` would prevent that flexibility. |
| `isSequential` separate from `ruleType` | Sequential vs parallel is an independent axis from how the workflow resolves. A workflow can be sequential AND percentage-based. Merging them into one enum would require an enum value for every combination. |
| `isActive` on `ExpenseCategory` (soft-delete) | Categories with existing expenses cannot be hard-deleted without breaking historical records. Soft-disable hides them from new submissions while preserving all existing data. |
| `paidById` nullable FK on `Expense` | "Paid by" from the expense form is a person within the company. Nullable because the employee may leave it blank. Stored as a FK rather than a plain string to maintain referential integrity. |
