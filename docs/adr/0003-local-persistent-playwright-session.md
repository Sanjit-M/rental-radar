# Local Persistent Playwright Browser Session for Facebook Ingestion

## Context
Meta has deprecated personal user Graph API access for Facebook Groups, and automated programmatic login scripts that enter usernames and passwords trigger aggressive anti-bot checkpoints, CAPTCHAs, and account suspensions.

## Decision
We use Playwright with a persistent local Chromium user profile stored in `~/.fb_rental_profile`. The user runs an interactive one-time setup CLI (`pnpm auth:setup`) to log in naturally in a visible browser. Subsequent background and hourly scrape jobs launch headlessly using this authenticated session, preserving cookies and session state while bypassing bot detection checkpoints without storing credentials in source code.
