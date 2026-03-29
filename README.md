<div align="center">

# RefundFlow

**Role-based expense reimbursement management — built for teams that move fast.**

Submit expenses. Route approvals. Stay in control.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://prisma.io)
[![Auth.js](https://img.shields.io/badge/Auth.js-v5-purple)](https://authjs.dev)

</div>

---

## What is RefundFlow?

RefundFlow replaces messy spreadsheets and email chains with a structured platform for submitting, routing, and resolving expense reimbursements. Purpose-built for the Odoo Hackathon — but designed like a real product.

Three roles. One workflow. Zero paper.

| Role | What they do |
|------|-------------|
| **Admin** | Configure users, categories, approval rules, and company settings |
| **Manager** | Review and approve/reject assigned expense requests |
| **Employee** | Submit expenses and track reimbursement status |

---

## Features

### Expense Lifecycle
- Draft → Submitted → Approved / Rejected flow
- Structured fields: description, date, category, payer, currency, amount, receipt
- Immutable after submission — no retroactive edits

### Approval Engine
- Company-level active approval rule (one at a time)
- Sequential and parallel approval flows
- Required approvers with automatic rejection on decline
- Percentage-based and specific-approver conditional logic
- Mandatory comment on rejection

### Multi-Currency Support
- Country/currency catalog for onboarding and selection
- Exchange rate locked at submission time — never recomputed from history
- Normalized company-currency reporting

### Authentication & Access
- Credentials-based auth via Auth.js v5
- Company bootstrap on first admin signup
- Password reset with forced change on first login
- Session-aware route protection per role

### Administration
- Create/manage users and assign roles
- Configure employee → manager mappings
- Expense categories with soft-delete integrity
- Password delivery to new users via email

### Notifications
- SMTP email delivery (Nodemailer)
- Workflow and credential notifications
- Failure-safe — email errors don't break API responses

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 + React 19 |
| Auth | Auth.js v5 (next-auth@beta) |
| ORM | Prisma + SQLite (libSQL) |
| Styling | Tailwind CSS 4 |
| Validation | Zod |
| Email | Nodemailer (SMTP) |
| Runtime | Bun |

---

## Getting Started

### 1. Install

```bash
bun install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your values:

```dotenv
DATABASE_URL="file:./dev.db"
AUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM_EMAIL="RefundFlow <no-reply@example.com>"

EXCHANGERATE_API_KEY=""
```

### 3. Database Setup

```bash
bunx prisma migrate dev
bunx prisma db seed
```

### 4. Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Common Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run start        # Start production server
bun run lint         # Lint all files
bunx prisma studio   # Open Prisma database UI
```

---

## Repository Layout

```
app/          Routes, pages, and API handlers
components/   UI primitives and feature components
lib/          Shared services (auth, mail, prisma, currency, utils)
hooks/        Client-side data hooks
prisma/       Schema, migrations, seed
types/        Shared type contracts
docs/         Team roles and module ownership
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/auth/signup` | Company + admin signup |
| POST | `/api/auth/forgot-password` | Send reset credentials |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/users` | List company users |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/[id]` | Update user |
| POST | `/api/users/[id]/send-password` | Email credentials |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| PATCH | `/api/categories/[id]` | Update category |
| DELETE | `/api/categories/[id]` | Delete category |
| GET | `/api/currencies` | Currency catalog |
| GET | `/api/currencies/convert` | Convert amount |

> Expense, approval, and approval-rule endpoints are being completed incrementally — see `docs/ROLES.md` for ownership.

---

## Business Rules

1. Only one approval rule may be active per company at a time.
2. A required approver rejecting immediately rejects the whole request.
3. All rejections require a comment.
4. Submitted expenses are read-only for employees.
5. Managers cannot submit personal expenses.
6. Currency conversion values are fixed at submission time — never recomputed.

---

## Contributing

- Use `bun` for all package and script operations — never `npm`.
- Keep `.env.local` out of version control.
- Run `bun run lint` on touched files before opening a PR.
- Respect module ownership documented in [`docs/ROLES.md`](./docs/ROLES.md).
- Prisma migrations run on `main` only.
