# Arbor Finance

A full-stack personal finance management application built with Next.js and Supabase.

**Live demo:** [arbor-chi.vercel.app](https://arbor-chi.vercel.app)

## Overview

[ADD 2–3 sentences: what does the app actually let a user do? e.g. "Arbor Finance lets users track income and expenses across multiple accounts, categorize transactions, and view spending trends over time." Replace this line with the real feature set.]

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend / Database:** Supabase (PostgreSQL, authentication, row-level security)
- **Deployment:** Vercel

## Architecture

```
app/                 # Next.js App Router pages and layouts
components/           # Reusable UI components
hooks/                 # Custom React hooks
modules/               # [ADD: brief description — e.g. "domain logic grouped by feature (transactions, budgets, accounts)"]
public/                # Static assets
utils/supabase/        # Supabase client configuration and helpers
```

**Key decisions:**
- [ADD: why Supabase over a custom backend? e.g. "Chosen for built-in auth and row-level security, avoiding a separate auth service."]
- [ADD: any notable architectural choice — e.g. how transactions/categories are modeled, whether data fetching is server- or client-side, any caching strategy.]

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (see [Environment Variables](#environment-variables))

### Installation

```bash
git clone https://github.com/Pablogl01/arbor-finance.git
cd arbor-finance
npm install
```

### Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Running locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

The project is deployed on Vercel with automatic deployments from the `main` branch. To deploy your own instance, connect the repository to a Vercel project and configure the same environment variables listed above.

## License

Personal project — not licensed for reuse
