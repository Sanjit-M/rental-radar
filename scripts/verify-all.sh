#!/usr/bin/env bash
set -euo pipefail

echo "=== [1/6] Go Build & Unit Tests ==="
go build -o bin/radar-scraper ./cmd/radar-scraper && go test -v ./...

echo "=== [2/6] Go Scraper Self-Test Parse ==="
./bin/radar-scraper test-parse "1 Room available in 3BHK flat at Sobha Iris, Kadubeesanahalli near Prestige Tech Park. Rent 22000, deposit 45000. Zero brokerage, attached washroom, swimming pool, power backup. Contact 9845012345"

echo "=== [3/6] TypeScript Typecheck ==="
pnpm tsc --noEmit

echo "=== [4/6] Vitest Suite ==="
pnpm test

echo "=== [5/6] React Doctor Diagnostics ==="
CI=1 npx -y react-doctor@latest . --verbose --no-diff

echo "=== [6/6] Production Build ==="
pnpm build

echo "=== ALL VERIFICATION CHECKS PASSED ==="
