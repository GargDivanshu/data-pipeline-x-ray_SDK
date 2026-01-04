# X-Ray SDK Project

Welcome to the X-Ray SDK project! This repository contains the X-Ray SDK and a demo application showcasing pipeline observability.

## Prerequisites

- **Node.js** (v18+ recommended)
- **pnpm** (Package manager)
- **PostgreSQL** (Database)

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd xray_sdk
    ```

2.  **Install dependencies:**
    This project uses `pnpm`.
    ```bash
    pnpm install
    ```

3.  **Configure Environment:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` if your PostgreSQL credentials differ from the defaults (`postgres:postgres@localhost:5432/xray`).

4.  **Database Setup:**
    Create the database and apply the schema:
    ```bash
    # Create database (if using standard postgres tooling)
    createdb xray

    # Apply schema
    psql -d xray -f schema.sql
    ```

## Running the Application

1.  **Start the Next.js Development Server:**
    This runs the API and UI.
    ```bash
    pnpm dev
    ```
    The server will start at `http://localhost:3000`.

## Running the Demo

The demo pipeline simulates a competitor selection process. The server **must be running** before executing the pipeline script.

1.  **Ensure the server is running** (Step 1 above).

2.  **Run the demo pipeline script:**
    ```bash
    npx tsx app/demo/pipeline.ts
    ```
    
    Or for the categorization demo:
     ```bash
    npx tsx app/demo/categorization_pipeline.ts
    ```

    You should see output in the console indicating steps are executing (Search, Filter, Rank, Select).

3.  **Verify Results:**
    Check the database or logs to see the recorded run and steps.
    ```sql
    select * from xray_runs;
    select * from xray_steps;
    ```

## Project Structure

- **`packages/xray-sdk`**: Core SDK logic.
- **`app/`**: Next.js application (Server & UI).
- **`app/demo/`**: Demo pipeline scripts.
- **`schema.sql`**: Database schema definition.
