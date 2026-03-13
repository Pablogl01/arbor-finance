# GEMINI.md - Arbor Finance

## Project Overview

This is a personal finance management application named **Arbor Finance**. It is a web application built with [Next.js](https://nextjs.org/) and [TypeScript](https://www.typescriptlang.org/). The primary purpose of the application is to allow users to track their financial assets, including bank accounts and ETF investments.

The project follows a modern, modular architecture, separating concerns into `domain`, `application`, and `infrastructure` layers. This promotes a clean, scalable, and maintainable codebase.

**Key Technologies:**

*   **Framework:** Next.js (React)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Backend & Database:** Supabase
*   **Linting:** ESLint

## Building and Running

### Prerequisites

*   Node.js (v20 or higher recommended)
*   npm, yarn, pnpm, or bun

### Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env.local` file in the root of the project and add your Supabase project URL and anon key:
    ```
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

### Running the Application

*   **Development:** To run the application in development mode with hot-reloading:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

*   **Production Build:** To create a production-ready build:
    ```bash
    npm run build
    ```

*   **Start Production Server:** To start the production server after building:
    ```bash
    npm run start
    ```

### Linting

To check the code for any linting errors, run:
```bash
npm run lint
```

## Development Conventions

*   **Modular Architecture:** The core business logic is organized into modules within the `src/modules` directory. Each module is divided into:
    *   `domain`: Contains the core business models and repository interfaces. (e.g., `Account.ts`, `ETF.ts`)
    *   `application`: Contains the use cases and application-level logic. (e.g., `CreateAccountUseCase.ts`)
    *   `infrastructure`: Contains the concrete implementations of the repository interfaces, interacting with external services like Supabase. (e.g., `SupabaseAccountRepository.ts`)

*   **Styling:** The project uses Tailwind CSS for styling. Utility classes are preferred over custom CSS. Global styles are defined in `app/globals.css`.

*   **Database:** Supabase is used for the database and backend services. The Supabase client is configured in `utils/supabase/client.ts`. Data access is handled through the repository pattern.

*   **Components:** Reusable React components are located in the `components` directory, organized by feature or type (e.g., `charts`, `forms`, `layout`).
