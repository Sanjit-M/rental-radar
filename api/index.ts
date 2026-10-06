import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { app } from '../src/server/app';

export const config = {
  runtime: 'edge',
};

const edgeApp = new Hono();

edgeApp.use('*', cors());

// Scrape Trigger Endpoints (Dispatches GitHub Actions scraper workflow)
const triggerRouteHandler = async (c: any) => {
  try {
    const token = process.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'Sanjit-M/rental-radar';
    const ref = process.env.GITHUB_REF || 'main';
    const workflow = process.env.GITHUB_WORKFLOW || 'scraper.yml';

    if (!token) {
      return c.json(
        {
          status: 'error',
          message:
            'GITHUB_DISPATCH_TOKEN is not configured in Vercel environment variables. Please add a GitHub Personal Access Token with actions:write permission.',
        },
        500
      );
    }

    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
    const response = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Rental-Radar-Trigger',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
    });

    if (response.status === 204) {
      return c.json({
        status: 'success',
        message:
          'GitHub Actions scrape workflow dispatched successfully. New listings will sync within 2-3 minutes.',
      });
    }

    let errorDetails = '';
    try {
      const errorJson: any = await response.json();
      errorDetails = errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetails = response.statusText || 'Unknown error';
    }

    return c.json(
      {
        status: 'error',
        message: `GitHub Actions dispatch failed (HTTP ${response.status}): ${errorDetails}`,
      },
      502
    );
  } catch (err: any) {
    return c.json(
      {
        status: 'error',
        message: `Failed to dispatch GitHub Actions workflow: ${err?.message || String(err)}`,
      },
      500
    );
  }
};

// Scrape Status Polling Handler (Checks GitHub Actions workflow run status)
const scrapeStatusHandler = async (c: any) => {
  try {
    const token = process.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'Sanjit-M/rental-radar';
    const workflow = process.env.GITHUB_WORKFLOW || 'scraper.yml';

    if (!token) {
      return c.json({
        status: 'idle',
        conclusion: null,
        message: 'No GitHub token configured',
      });
    }

    const runsUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=1`;
    const res = await fetch(runsUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Rental-Radar-Trigger',
      },
    });

    if (!res.ok) {
      return c.json({
        status: 'idle',
        conclusion: null,
        message: `GitHub API error: ${res.statusText}`,
      });
    }

    const data: any = await res.json();
    const run = data.workflow_runs?.[0];
    if (!run) {
      return c.json({
        status: 'idle',
        conclusion: null,
        message: 'No workflow runs found',
      });
    }

    return c.json({
      status: run.status,
      conclusion: run.conclusion,
      runId: run.id,
      htmlUrl: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    });
  } catch (err: any) {
    return c.json({
      status: 'idle',
      conclusion: null,
      error: err?.message || String(err),
    });
  }
};

// Vercel Edge GitHub Actions dispatch endpoints
edgeApp.post('/scrape/trigger', triggerRouteHandler);
edgeApp.post('/api/scrape/trigger', triggerRouteHandler);
edgeApp.post('/scrape/seed', triggerRouteHandler);
edgeApp.post('/api/scrape/seed', triggerRouteHandler);
edgeApp.get('/scrape/status', scrapeStatusHandler);
edgeApp.get('/api/scrape/status', scrapeStatusHandler);

// Consolidate shared application routes (/health, /config, /listings, /stats, /scrape/parse-single, etc.)
edgeApp.route('/', app);

export default edgeApp.fetch;
