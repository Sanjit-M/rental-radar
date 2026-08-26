# Free Cloud Deployment Architecture: Vercel, Turso, and GitHub Actions

## Context
Deploying a scraping-heavy application requires balancing ephemeral serverless execution limits, persistent database storage, and anti-bot protection on Facebook. Vercel serverless functions have a 15-second timeout and lack persistent disk storage for SQLite files. Furthermore, datacenter IPs often trigger Facebook checkpoints when logging in.

## Decision
We deploy the system using a 100% free multi-cloud serverless topology:
1. **Frontend & Backend API**: Deployed to Vercel in a single monorepo using React + Vite on the Edge CDN and Hono via `hono/vercel` serverless functions.
2. **Dual-Mode SQLite Database**: Local development uses Node's native `node:sqlite`. Production uses Turso Cloud SQLite (`@libsql/client`) over HTTP (100% free tier: 9GB storage, 1B row reads/month).
3. **Automated Scraping**: Runs every hour via a scheduled GitHub Actions workflow (`.github/workflows/scraper.yml`).
4. **Facebook Authentication**: Active session cookies are exported locally via `pnpm auth:export` and stored in GitHub Secrets (`FB_SESSION_STORAGE`), allowing Playwright to scrape authenticated groups in GitHub Actions without credentials.
5. **Dashboard Protection**: Protected by a lightweight passcode gate (`DASHBOARD_PASSCODE`).
