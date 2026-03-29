# Product Requirements Document
## Reimbursement Management System — Odoo Hackathon MVP

**Version:** 2.0 (Final)
**Date:** March 2026
**Tech Stack:** Next.js App Router · Auth.js v5 · Prisma ORM · SQLite · TypeScript · Nodemailer · Tesseract.js
**Brand:** Linen Cloud `#F8F9ED` (Primary) · Plum Wine `#5E4075` (Secondary)

---

## 1. Problem Statement

Companies struggle with manual expense reimbursement processes that are time-consuming, error-prone, and lack transparency. There is no simple way to define approval flows, manage multi-level approvals, or support flexible conditional approval rules across teams.

---

## 2. Goals & Scope (MVP)

| Goal | In Scope |
|------|----------|
| Digitise expense submission | ✅ |
| Role-based access (Admin / Manager / Employee) | ✅ |
| One active global approval rule per company | ✅ |
| Sequential & parallel approvals with hybrid logic | ✅ |
| Conditional rules (%, specific approver, hybrid) | ✅ |
| Multi-currency with real-time conversion | ✅ |
| OCR receipt scanning (Tesseract.js, client-side) | ✅ |
| Email notifications via Nodemailer | ✅ |
| Admin-configurable expense categories | ✅ |
| Audit log / approval history | ✅ |
| 2 pre-seeded default approval rules per company | ✅ |
| Multiple simultaneous active rules | ❌ post-MVP |
| Mobile app | ❌ post-MVP |

---

## 3. Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Auto-created on signup; creates company & sets base currency; manages users, roles & manager relationships; configures approval rules (activate/deactivate); manages expense categories; views all expenses; can override approvals |
| **Manager** | Approve / reject expenses assigned to them (rejection comment required); views amount in company base currency; views team expenses; **cannot** submit their own expenses |
| **Employee** | Submit expense claims in any currency; view own expense history with status; view approval log on each expense |

> **Note:** A user has exactly one role at a time. Manager and Employee are mutually exclusive in this MVP.

---

## 4. Feature Requirements

### 4.1 Authentication & Company Setup

**Auth strategy: Auth.js v5 (NextAuth) — Credentials Provider · Prisma Adapter · httpOnly cookie sessions.**

#### Admin Signup

Fields: Name · Email · Password · Confirm Password · Country (dropdown via `restcountries` API)

- On signup → Company record auto-created; selected country's currency becomes company **base currency**.
- Only 1 admin per company.

#### Sign In

Fields: Email · Password

- Standard credentials login.
- "Forgot Password" → Nodemailer emails a randomly generated password; user must change it on first login after reset.

#### User Management (Admin)

Admin manages users from a table UI:

| Column | Details |
|--------|---------|
| User (name) | Text; can create a new user inline if name not found |
| Role | Dropdown: Employee / Manager |
| Manager | Dynamic dropdown; initially pulled from user record; admin can override |
| Email | Required for login |
| Send Password | Button — triggers Nodemailer email with auto-generated password |

---

### 4.2 Email Notifications (Nodemailer)

| Trigger | Recipient |
|---------|-----------|
| User login | The user who logged in (login confirmation) |
| Employee submits expense | Assigned approver(s) |
| Manager approves an expense | Employee (submitter) |
| Manager rejects an expense | Employee (submitter) |
| Expense fully approved (final stage) | Employee (submitter) |
| Required approver rejects → auto-reject | Employee (submitter) |

All email templates live in `lib/mail.ts`. Person A sets up the Nodemailer client; Persons B and C call the helper functions.

---

### 4.3 Expense Categories (Admin-Configurable)

- Admin can **add, rename, and soft-disable** categories from an admin settings page.
- **Default seeded categories:** Food · Travel · Accommodation · Miscellaneous
- Categories with existing expenses cannot be hard-deleted — they are soft-disabled (hidden from new submissions but preserved on historical records).

---

### 4.4 Expense Submission (Employee)

#### Form Fields

| Field | Notes |
|-------|-------|
| Description | Free text, required |
| Expense Date | Date picker, required |
| Category | Dropdown from admin-configured list |
| Paid By | Dropdown (employee names in company) |
| Currency | Dropdown of all world currencies |
| Amount | Numeric; in the selected currency |
| Remarks | Optional free text |
| Receipt | Upload file **or** OCR scan |

#### Behaviour

- Employee may submit in any currency; conversion is handled downstream at manager view.
- On submit → record becomes **read-only** for employee; status → `Waiting Approval`.
- **Submit** button only visible in `Draft` state.
- **Attach Receipt** button available before submission.

#### Status Flow

```
Draft → Waiting Approval → Approved
                        ↘  Rejected
```

#### Employee Dashboard — Top Counters

| Counter | Meaning |
|---------|---------|
| To Submit | Expenses in Draft state (total amount) |
| Waiting Approval | Submitted, pending approvers (total amount) |
| Approved | Final approved total |

List columns: Employee · Description · Date · Category · Paid By · Remarks · Amount · **Status**

---

### 4.5 OCR Receipt Scanning (Tesseract.js — Client-Side)

- Employee uploads a receipt image or takes a photo.
- Tesseract.js runs **in the browser** — no server round-trip, no external API cost.
- Auto-fills: Amount · Date · Description · Category (best-guess) · Merchant name.
- Employee reviews and edits all fields before submitting.
- Receipt image stored server-side (in `/public/uploads` or similar) and linked to the expense record.

---

### 4.6 Approval Rule (One Active Rule Per Company)

#### Pre-seeded Defaults (applied via `prisma/seed.ts` on company creation)

| Rule Name | Config |
|-----------|--------|
| **Simple Manager Approval** | Is Manager Approver ✅ · No extra approvers · 100% threshold |
| **Finance + Manager** | Is Manager Approver ✅ · Sequential ON · Finance user as required approver |

Admin can modify these or create new ones. Only **one rule is active** at a time — admin activates/deactivates explicitly.

#### Approval Rule Fields

| Field | Notes |
|-------|-------|
| Name / Description | Label for the rule |
| Is Manager an Approver? | Checkbox — if checked, expense routes to employee's manager **first**, before other approvers |
| Approvers list | N rows: User · Required (checkbox) |
| Approvers Sequence | Checkbox — ON = sequential (one by one in order); OFF = parallel (all at once) |
| Minimum Approval % | Numeric — fraction of approvers required for auto-approval |
| Is Active | Boolean — only one rule active per company at a time |

#### Sequential Flow (Approvers Sequence = ON)

1. If "Is Manager Approver" checked → manager receives request first.
2. Only after Step N acts does Step N+1 get notified.
3. If a **Required** approver rejects → expense **auto-rejected** immediately; chain stops; Nodemailer fires.

#### Parallel Flow (Approvers Sequence = OFF)

- All approvers notified simultaneously.
- Auto-approved once **Minimum Approval %** threshold is reached.

#### Conditional Logic (inside one rule)

| Rule Type | Logic |
|-----------|-------|
| Percentage rule | If X% of approvers approve → expense approved |
| Specific approver rule | If a named required approver approves → expense auto-approved |
| Hybrid rule | X% **OR** specific required approver approves → approved |

These modes combine with sequential/parallel config inside the single active rule.

---

### 4.7 Manager Approval Dashboard

Table: **Approvals to Review**

| Column | Notes |
|--------|-------|
| Approval Subject | Expense description |
| Request Owner | Employee name |
| Category | Expense category |
| Request Status | Current status |
| Total Amount (base currency) | Real-time converted e.g. `567 $ (in INR) = 49,896` |
| Approve / Reject buttons | Visible only while pending |

**Rejection flow:** Manager must enter a **required** comment before rejecting — a modal prompts for the reason; no comment = reject blocked.

**Post-action:** Row becomes read-only, status updated, action buttons disappear.

#### Approval Log (on every expense detail view)

| Approver | Status | Comment | Time |
|----------|--------|---------|------|
| Sarah | Approved | — | 12:44, 4th Oct 2025 |
| John | Rejected | Amount seems inflated | 09:12, 5th Oct 2025 |

---

### 4.8 Currency Conversion

- **Countries + Currencies:** `https://restcountries.com/v3.1/all?fields=name,currencies`
- **Live Conversion:** `https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}`
- Conversion happens at **real-time today's rates** when the manager dashboard loads.
- Employee always sees their original submitted amount; manager always sees company base currency.

#### Exchange Rate Locking

- The exchange rate is **locked at submission time** — never recalculated using today's rate when displaying historical expenses.
- The following fields are stored on the Expense record at the moment of submission:
  - `submittedAmount` — the original amount in the employee's chosen currency
  - `submittedCurrency` — the currency code at time of submission
  - `convertedAmount` — the amount converted to company base currency at submission
  - `exchangeRateUsed` — the exact rate applied during conversion
- All historical expense views (employee history, manager dashboard, audit log) must read `convertedAmount` and `exchangeRateUsed` directly from the record — **never re-fetch or recalculate**.

---

## 5. API Routes

```
POST   /api/auth/[...nextauth]              # Auth.js v5 catch-all handler

GET    /api/users                           # Admin: list users
POST   /api/users                           # Admin: create user
PATCH  /api/users/[id]                      # Admin: update role/manager
POST   /api/users/[id]/send-password        # Admin: trigger Nodemailer password email

GET    /api/expenses                        # Employee: own / Admin: all
POST   /api/expenses                        # Employee: create draft
GET    /api/expenses/[id]
PATCH  /api/expenses/[id]                   # Employee: edit draft
POST   /api/expenses/[id]/submit            # Employee: submit draft → Waiting Approval
POST   /api/expenses/[id]/attach            # Employee: upload receipt file

GET    /api/approvals                       # Manager: pending queue
POST   /api/approvals/[id]/approve          # Manager: approve (optional comment)
POST   /api/approvals/[id]/reject           # Manager: reject (comment required)

GET    /api/approval-rules                  # Admin: list rules
POST   /api/approval-rules                  # Admin: create rule
PATCH  /api/approval-rules/[id]             # Admin: update rule
POST   /api/approval-rules/[id]/activate    # Admin: set as the active rule
DELETE /api/approval-rules/[id]             # Admin: delete inactive rule

GET    /api/categories                      # All roles: list active categories
POST   /api/categories                      # Admin: create
PATCH  /api/categories/[id]                 # Admin: rename / soft-disable
DELETE /api/categories/[id]                 # Admin: hard delete (only if no expenses)

GET    /api/currencies                      # Proxy: restcountries list
GET    /api/currencies/convert              # Proxy: exchangerate-api
```

---

## 6. External Services

| Service | Usage | Notes |
|---------|-------|-------|
| `restcountries.com` | Country dropdown + base currency on signup | Called once at signup |
| `exchangerate-api.com` | Real-time conversion in manager dashboard | Called per approvals page load |
| **Nodemailer** | All transactional emails | Server-side via Nodemailer SMTP |
| **Tesseract.js** | OCR receipt parsing | Fully client-side, zero API cost |
| **Auth.js v5** | Sessions, credentials login, Prisma adapter | httpOnly cookies |

---

## 7. Design Tokens

```css
--color-primary:     #F8F9ED;   /* Linen Cloud — page backgrounds */
--color-secondary:   #5E4075;   /* Plum Wine — buttons, active states, accents */
--color-bg:          #F8F9ED;
--color-surface:     #FFFFFF;
--color-text:        #1A1A2E;
--color-muted:       #6B7280;
--color-success:     #4CAF7C;   /* Approved badges */
--color-danger:      #E05252;   /* Rejected badges, required field errors */
--color-warning:     #F0A830;   /* Waiting approval badges */
--color-border:      #E2E4D8;
```

---

## 8. Directory Structure

3-person team — minimal merge conflicts by vertical slice ownership.

**Split:** Person A → Auth + Admin | Person B → Expenses + OCR | Person C → Approvals + Engine

```
reimbursement-management-odoo/
│
├── app/
│   ├── (auth)/                                   # Person A
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                            # Shared sidebar + navbar
│   │   │
│   │   ├── admin/                                # Person A
│   │   │   ├── users/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   └── approval-rules/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   │
│   │   ├── manager/                              # Person C
│   │   │   └── approvals/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   │
│   │   └── employee/                             # Person B
│   │       └── expenses/
│   │           ├── page.tsx
│   │           ├── new/page.tsx
│   │           └── [id]/page.tsx
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts           # Person A
│   │   ├── users/
│   │   │   ├── route.ts                          # Person A
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── send-password/route.ts
│   │   ├── expenses/
│   │   │   ├── route.ts                          # Person B
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── submit/route.ts
│   │   │       └── attach/route.ts
│   │   ├── approvals/
│   │   │   ├── route.ts                          # Person C
│   │   │   └── [id]/
│   │   │       ├── approve/route.ts
│   │   │       └── reject/route.ts
│   │   ├── approval-rules/
│   │   │   ├── route.ts                          # Person C
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── activate/route.ts
│   │   ├── categories/
│   │   │   ├── route.ts                          # Person A
│   │   │   └── [id]/route.ts
│   │   ├── currencies/
│   │   │   ├── route.ts                          # Person A (setup)
│   │   │   └── convert/route.ts
│   │   └── ocr/route.ts                          # Person B (optional server fallback)
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/                                       # Person A sets up first PR — then frozen
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── modal.tsx
│   │   ├── table.tsx
│   │   ├── dropdown.tsx
│   │   └── index.ts                              # barrel export
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── navbar.tsx
│   │   └── dashboard-shell.tsx
│   ├── expense/                                  # Person B owns
│   │   ├── expense-form.tsx
│   │   ├── expense-table.tsx
│   │   ├── expense-status-badge.tsx
│   │   ├── receipt-upload.tsx
│   │   └── ocr-scanner.tsx
│   ├── approval/                                 # Person C owns
│   │   ├── approval-table.tsx
│   │   ├── approval-log.tsx
│   │   ├── reject-modal.tsx
│   │   └── approval-rule-form.tsx
│   └── user/                                     # Person A owns
│       ├── user-table.tsx
│       └── user-form.tsx
│
├── lib/
│   ├── prisma.ts                                 # Prisma client singleton
│   ├── auth.ts                                   # Auth.js v5 config + session helpers
│   ├── currency.ts                               # restcountries + exchangerate-api
│   ├── mail.ts                                   # Nodemailer client + all email templates
│   ├── ocr.ts                                    # Tesseract.js wrapper + field parser
│   ├── approval-engine.ts                        # Core workflow logic — Person C owns exclusively
│   └── utils.ts                                  # cn(), formatCurrency(), formatDate()
│
├── hooks/
│   ├── use-expenses.ts                           # Person B
│   ├── use-approvals.ts                          # Person C
│   ├── use-users.ts                              # Person A
│   └── use-currencies.ts                         # shared
│
├── types/
│   ├── expense.ts
│   ├── approval.ts
│   ├── user.ts
│   └── index.ts                                  # barrel — finalise in Week 1
│
├── prisma/
│   ├── schema.prisma                             # DB schema (separate doc)
│   ├── seed.ts                                   # Seeds default categories + 2 approval rules
│   └── migrations/
│
├── public/
│   ├── uploads/                                  # Receipt images stored here
│   └── logo.svg
│
├── .env.example                                  # Committed — lists all keys without values
├── .env.local                                    # Gitignored — actual secrets
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── bun.lock
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

### Team Ownership at a Glance

| Area | Person A | Person B | Person C |
|------|----------|----------|----------|
| Auth.js v5 setup, login, signup | ✅ | | |
| Forgot password + Nodemailer setup (`lib/mail.ts`) | ✅ | | |
| Admin user management | ✅ | | |
| Admin category management | ✅ | | |
| Currency API proxy | ✅ setup | uses | uses |
| `components/ui/` primitives (first PR) | ✅ | | |
| Employee expense CRUD | | ✅ | |
| OCR + Tesseract.js | | ✅ | |
| Receipt upload | | ✅ | |
| Manager approval dashboard | | | ✅ |
| Approval rule config UI + activate flow | | | ✅ |
| `lib/approval-engine.ts` | | | ✅ |

> **5 conflict-reduction rules:**
> 1. Lock `types/index.ts` interfaces together in Week 1 — no unilateral changes after.
> 2. `components/ui/` ships in Person A's first PR; nobody touches it after without a team review.
> 3. `lib/approval-engine.ts` is Person C's file exclusively — route handlers call it, never inline the logic.
> 4. All Prisma migrations run only on `main`, never on feature branches.
> 5. Commit a `.env.example` with all required keys listed (no values) so no one is blocked waiting for env setup.

---

## 9. Key Business Rules (Locked)

1. Expense submitted in any currency → converted at live rate when shown to manager.
2. **Is Manager Approver** checked → manager is always Step 1 before configured approvers.
3. **Sequential ON** → each approver acts before the next is notified.
4. **Required approver rejects** → expense auto-rejected immediately; chain stops; Nodemailer fires.
5. **Minimum Approval %** → auto-approves once threshold is met in parallel mode.
6. Once submitted, expense is **read-only** for the employee.
7. Once acted upon, manager row is **read-only** and action buttons disappear.
8. Rejection **requires** a comment — submit blocked until comment is entered.
9. Only **one approval rule is active per company** at any time.
10. Two rules are **pre-seeded** on company creation — admin can modify or replace.
11. Categories are **admin-configurable**; those with existing expenses can only be soft-disabled.
12. **Manager role cannot submit expenses** — manager and employee are mutually exclusive.
13. Approval log (approver · status · comment · timestamp) always visible on expense detail.
14. Admin can override any approval at any stage.
15. **Exchange rate is locked at submission** — store `submittedAmount`, `submittedCurrency`, `convertedAmount`, and `exchangeRateUsed` on the Expense record; never recalculate using today's rate when displaying historical expenses.

---

## 10. Environment Variables

```bash
# .env.example — commit this file
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM_EMAIL="Reimbursement <no-reply@example.com>"
EXCHANGERATE_API_KEY=""          # optional if exchangerate-api free tier used without key
```
