# Rental Radar v2 Orchestration Plan

## Objectives
Deliver Rental Radar v2 fully meeting all acceptance criteria in `ORIGINAL_REQUEST.md`:
1. R1: Interactive Geospatial Map (Leaflet + CartoDB Dark Matter)
2. R2: Cross-Group Deduplication & Recency Filtering
3. R3: Advanced Scoring Algorithm Updates
4. R4: Backend Database Pagination & Edge API Optimization
5. R5: Complete Documentation & Deployment Verification

## Execution Strategy (Project Pattern - Dual Track)
- **Phase 0: Survey**
  - Explorer 1 (Codebase & Backend): Map existing SQLite/Turso schemas, `/api/listings`, scrapers, scoring logic.
  - Explorer 2 (Frontend & Map): Map existing dashboard views, Leaflet/Map requirements, responsive switching, UI components.
  - Spec Miner (Requirements & Edge Cases): Extract exact algorithmic penalties, deduplication heuristics, pagination specs, coordinate mapping.
- **Phase 1: Architecture & Feature Inventory (PROJECT.md)**
  - Merge findings into structured feature inventory and milestone definitions with interface contracts.
- **Phase 2: E2E Testing Track Orchestrator**
  - Spawns parallel track to establish opaque-box test runner, Tiers 1-4 tests (Feature, Boundary, Combinations, Real-World).
- **Phase 3: Implementation Track (Sub-Orchestrators)**
  - Milestone 1: Backend Database Pagination, Edge API, and Scraping updates.
  - Milestone 2: Deduplication Engine & Advanced Scoring Algorithm.
  - Milestone 3: Geospatial Map Integration & Dashboard UI (Map/Grid/Table views).
  - Milestone 4: Documentation, Verification, Build & Deployment.
- **Phase 4: Integration & E2E Validation**
  - Verify 100% test pass on E2E test suite (Tiers 1-4) followed by Adversarial Coverage Hardening (Tier 5).
  - Forensic Auditor integrity review.
- **Phase 5: Victory Claim**
  - Final report to Sentinel.
