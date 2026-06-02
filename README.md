# ListFlow — Agent List Allocator

ListFlow is an admin workspace for creating agent accounts, validating customer spreadsheets, and distributing records evenly across a five-agent team. The app uses TanStack Start with React for its frontend and server functions, and Supabase (PostgreSQL + JWT-backed Auth) for persistence and authentication.

> The original assignment requests MongoDB and Express. This repository was scaffolded with TanStack Start and Supabase, so the implementation keeps that existing architecture while delivering the requested product behavior: authenticated admin access, protected server operations, persisted agent accounts, spreadsheet validation, five-agent allocation, and assigned-list views.

## Features

- Immediately usable browser-local admin workspace for evaluation, plus JWT-backed Supabase sign-up, sign-in, protected routes, and sign-out for connected deployments.
- Agent creation with name, email, country code, mobile number, and a required temporary password.
- One-way `scrypt` hashes for stored agent passwords; hashes are never selected into browser responses.
- CSV, XLSX, and XLS uploads with required `FirstName`, `Phone`, and `Notes` headers.
- Strict validation for extension, 5 MB file size, 10,000-row limit, required fields, phone values, and note length.
- Round-robin distribution across exactly five agents. Remaining records are assigned sequentially from the first agent.
- Responsive dashboard metrics, readiness guidance, preview tables, and per-agent assigned-list views.
- Row-level security policies that isolate each admin's agents and list records.

## Prerequisites

- [Bun](https://bun.sh/) 1.2 or newer
- A Supabase project
- Supabase CLI if you want to apply migrations locally

## Environment configuration

Copy the example environment file and add values from **Supabase → Project Settings → API**:

```bash
cp .env.example .env
```

Required variables:

```dotenv
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

Only the publishable key is exposed to the browser. Authorization remains protected by Supabase JWTs and database row-level security.

## Database setup

Apply the SQL migrations in `supabase/migrations` to your Supabase project. With the Supabase CLI linked to your project:

```bash
supabase db push
```

The migrations create the `agents` and `list_items` tables, indexes, ownership policies, and the hashed agent-password column.

## Install and run

```bash
bun install
bun run dev
```

Open the URL printed by Vite, keep **Local workspace** selected, create an admin account, and sign in. Local workspace mode stores evaluation data in your browser so every feature works immediately without an external service. Add five agents, then upload a CSV or Excel file.

For a connected deployment, choose **Supabase** on the login page instead. If Supabase email confirmation is enabled, confirm the account from the email before signing in.

To inspect the interface before creating or confirming an account, use the **Preview dashboard without signing in** action on the login screen. The `/demo` route is intentionally read-only; authenticated admins continue to use `/dashboard` for agent creation and list distribution.

## Spreadsheet format

All three headers are required. Example:

```csv
FirstName,Phone,Notes
Avery,+15551230001,Requested a callback
Morgan,+15551230002,Interested in premium plan
Riley,+15551230003,
```

Accepted file extensions are `.csv`, `.xlsx`, and `.xls`.

## Distribution rule

New records are assigned round-robin to the first five agents ordered by creation date. For 27 records, seats 1 and 2 receive six records each; seats 3, 4, and 5 receive five records each.

## Quality checks

```bash
bun run check:features
bun run lint
bun run build
```

## Demo video

Add the Google Drive demonstration link here before submission: **TODO — upload a walkthrough and paste its share link.**
