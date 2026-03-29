# Roles & Responsibilities
## Reimbursement Management System — Team of 3

---

## Ground Rules (shared by all three)

| Rule | Why |
|------|-----|
| Prisma migrations run **only on `main`** | Prevents diverging DB state on feature branches |
| `types/index.ts` interfaces locked after **Week 1 kickoff PR** | Every file imports from here — unilateral changes cascade everywhere |
| `components/ui/` frozen after **Person A's first PR** | Touching shared primitives mid-sprint breaks everyone's UI |
| `lib/approval-engine.ts` is **Person C's file exclusively** | Route handlers call it; nobody else touches it |
| `.env.example` committed with all keys, `.env.local` gitignored | No one blocked waiting for env setup |

---

## Person A — Foundation · Auth · Admin

**Own these files exclusively:**
```
app/(auth)/login, signup, forgot-password
app/(dashboard)/admin/users, categories
app/(dashboard)/layout.tsx              ← shared shell, ship first
app/api/auth/[...nextauth]/route.ts
app/api/users/**
app/api/categories/**
app/api/currencies/**
components/ui/**                        ← ship in first PR, then freeze
components/layout/**
components/user/**
lib/prisma.ts, lib/auth.ts, lib/currency.ts, lib/mail.ts, lib/utils.ts
hooks/use-users.ts, hooks/use-currencies.ts
```

**Responsible for:**
- Auth.js v5 config: credentials provider, Prisma adapter, httpOnly cookie sessions
- Admin signup → auto-creates Company + sets base currency from country selection
- Admin user management table: create user, assign role, assign manager, send password email
- Nodemailer client setup in `lib/mail.ts` + all email helper functions (Person B & C call these, never write them)
- `components/ui/` primitive library — ship this in the **very first PR** so B and C can build on it
- Dashboard shell layout (sidebar + navbar) — ship alongside UI primitives
- Currency API proxies (`/api/currencies` + `/api/currencies/convert`)
- `lib/utils.ts` — `cn()`, `formatCurrency()`, `formatDate()`
- Prisma schema design + initial migration (coordinate with B and C on field names)
- Seed file structure (B and C add their seed data as functions)

> **Ships first** — Person B and C are blocked until `components/ui/` and `lib/prisma.ts` exist.

---

## Person B — Expenses · OCR

**Own these files exclusively:**
```
app/(dashboard)/employee/expenses/**
app/api/expenses/**
app/api/ocr/route.ts
components/expense/**
lib/ocr.ts
hooks/use-expenses.ts
```

**Responsible for:**
- Full expense CRUD: create draft → edit → attach receipt → submit
- Expense form fields: description, date, category, paid-by, currency, amount, remarks, receipt
- Status flow: `Draft → Waiting Approval → Approved / Rejected`
- Submit action: locks record as read-only; stores `submittedAmount`, `submittedCurrency`, `convertedAmount`, and `exchangeRateUsed` on the Expense record at submission time (call `/api/currencies/convert` once and persist — never recalculate later)
- Employee dashboard counters: To Submit / Waiting Approval / Approved totals
- OCR: Tesseract.js client-side, auto-fill form fields from receipt image
- Receipt upload: store to `/public/uploads/`, link path on expense record
- `expense-status-badge.tsx` used by everyone — coordinate with C on status enum values

> **Key constraint:** When displaying any historical expense, read `convertedAmount` and `exchangeRateUsed` directly from the DB record — never call the exchange rate API for historical data.

---

## Person C — Approvals · Engine

**Own these files exclusively:**
```
app/(dashboard)/admin/approval-rules/**
app/(dashboard)/manager/approvals/**
app/api/approvals/**
app/api/approval-rules/**
components/approval/**
lib/approval-engine.ts                  ← exclusively yours
hooks/use-approvals.ts
```

**Responsible for:**
- Core approval engine in `lib/approval-engine.ts`: sequential vs parallel flow, required-approver logic, minimum approval % threshold, auto-reject on required rejection
- Approval rule config UI: name, is-manager-approver, approvers list, sequence toggle, min %, is-active
- One-active-rule-per-company enforcement (activate route deactivates all others atomically)
- Manager dashboard: pending queue table, approve/reject buttons, rejection modal (comment required — submit blocked if empty)
- Post-action: row becomes read-only, buttons disappear
- Approval log component (`approver · status · comment · timestamp`) — rendered on expense detail by Person B's `[id]/page.tsx`
- Two pre-seeded rules via `prisma/seed.ts`: "Simple Manager Approval" and "Finance + Manager"
- All Nodemailer calls for approval events: call helpers from `lib/mail.ts` (Person A writes the templates, C only calls them)

> **Key constraint:** Logic never lives inline in route files — route handlers call `lib/approval-engine.ts` exclusively.

---

## Handoff Interfaces (agree on these in Week 1)

These are the exact touchpoints where one person's output becomes another's input.

| Interface | Producer | Consumer |
|-----------|----------|----------|
| `lib/mail.ts` email helpers | Person A | B and C call them |
| `components/ui/` primitives | Person A | B and C import them |
| `lib/utils.ts` formatters | Person A | B and C use them |
| `lib/approval-engine.ts` function signatures | Person C | Route handlers call it |
| `expense-status-badge.tsx` status enum | Person B | Person C uses same statuses |
| `approval-log.tsx` component props | Person C | Person B renders it on expense detail |
| Prisma `Expense` model fields (incl. `submittedAmount`, `submittedCurrency`, `convertedAmount`, `exchangeRateUsed`) | Person A (schema) | B writes, C reads |
| `types/index.ts` — `Expense`, `User`, `ApprovalRule` shapes | Agreed together Week 1 | Everyone imports, nobody edits unilaterally |

---

## Suggested Merge Order

Ordered to minimise blocked PRs and merge conflicts:

```
Week 1, PR 1 — Person A:  prisma schema + lib/prisma + lib/utils + components/ui + layout shell
Week 1, PR 2 — All:       types/index.ts locked together (single PR, all three review)
Week 2, PR 3 — Person A:  auth, admin pages, categories, currency APIs, mail helpers
Week 2, PR 4 — Person B:  expense CRUD + OCR           (depends on PR 1 & 2)
Week 2, PR 5 — Person C:  approval engine + rules + manager dashboard  (depends on PR 1 & 2)
Final,   PR 6 — Person B: approval-log integration into expense detail  (depends on PR 5)
```

---

## File Ownership at a Glance

| Area | Person A | Person B | Person C |
|------|:--------:|:--------:|:--------:|
| Auth.js v5 setup, login, signup | ✅ | | |
| Forgot password + Nodemailer setup (`lib/mail.ts`) | ✅ | | |
| Admin user management | ✅ | | |
| Admin category management | ✅ | | |
| Currency API proxy | ✅ setup | uses | uses |
| `components/ui/` primitives (first PR) | ✅ | | |
| Dashboard shell layout | ✅ | | |
| Employee expense CRUD | | ✅ | |
| Exchange rate locking at submission | | ✅ | |
| OCR + Tesseract.js | | ✅ | |
| Receipt upload | | ✅ | |
| Manager approval dashboard | | | ✅ |
| Approval rule config UI + activate flow | | | ✅ |
| `lib/approval-engine.ts` | | | ✅ |
| Approval log component | | | ✅ |
| Prisma schema + migrations | ✅ owns | contributes | contributes |
| `types/index.ts` | team-wide lock | team-wide lock | team-wide lock |
