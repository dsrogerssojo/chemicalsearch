# ChemicalSearch

ChemicalSearch is a deployable chemical/SDS lookup app with a static frontend and a Node/Express backend.

## Deployable Structure

```text
chemicalsearch-site/   Static frontend served as the site root
backend/               Node/Express API service
render.yaml            Render blueprint for frontend and backend
```

The frontend can be hosted by any static host. The backend can be hosted by any Node platform that can run `npm install` and `npm start` from `backend/`.

## Production URLs

```text
Frontend: https://chemicalsearch-site.onrender.com
Backend:  https://chemicalsearch-backend.onrender.com
Health:   https://chemicalsearch-backend.onrender.com/health
```

A `Cannot GET /` response at the backend root is normal. Use `/health`.

## Frontend Files

```text
chemicalsearch-site/index.html          Static shell and asset loading
chemicalsearch-site/runtime-config.js   Runtime API URL override from localStorage
chemicalsearch-site/app-base.css        Base app styles
chemicalsearch-site/styles.css          Layout, print, and fix styles
chemicalsearch-site/sojo-theme.css      SOJO visual theme
chemicalsearch-site/app.js              Main rendering, routing, search, details, request receipts
chemicalsearch-site/request-client.js   Add/update request form and supervisor review submission
chemicalsearch-site/layout-fixes.js     SOJO logo placement and Home button behavior
chemicalsearch-site/sojologo.webp       Local SOJO logo asset
chemicalsearch-site/sds-data-*.js       Built-in SDS records
chemicalsearch-site/sds-approved.js     Approved records written by the backend workflow
```

## Backend Files

```text
backend/package.json
backend/package-lock.json
backend/.env.example
backend/config.js
backend/server.js
tools/validate-deploy.mjs
```

## Backend Setup

```bash
cd backend
npm install
npm start
```

Health check:

```text
http://localhost:3001/health
```

Expected response:

```json
{"ok":true,"service":"chemicalsearch-backend"}
```

## Validation

Run this from the repository root before deploying:

```bash
node tools/validate-deploy.mjs
```

The script checks required frontend/backend files, verifies `index.html` asset references, and syntax-checks backend JavaScript.

## Environment Variables

Use `backend/.env.example` as the non-secret template. Do not commit real secrets.

Required for the full review workflow:

```text
POWER_AUTOMATE_WEBHOOK_URL
POWER_AUTOMATE_SHARED_SECRET
REVIEW_CALLBACK_SECRET
GITHUB_TOKEN
GITHUB_REPO
GITHUB_APPROVED_FILE
GITHUB_BRANCH
ALLOWED_ORIGINS
FRONTEND_DEPLOY_HOOK_URL
```

## Render

The included `render.yaml` defines:

```text
chemicalsearch-backend: Node web service from backend/
chemicalsearch-site: static site from chemicalsearch-site/
```

Render backend commands:

```text
Build: npm install
Start: npm start
```

Render frontend settings:

```text
Root directory: chemicalsearch-site
Publish directory: .
Build command: blank
```

## Approval Workflow

```text
User submits Add/Update Chemical request
Backend sends request to Power Automate
Teams Adaptive Card appears
Reviewer approves or denies
Power Automate calls backend review callback
Backend writes approved record to chemicalsearch-site/sds-approved.js through GitHub API
Backend triggers frontend deploy hook
Frontend redeploys
Approved chemical appears in search
```

Keep this workflow conservative. Do not rename environment variables or rewrite the approval/writeback/deploy-hook path without testing it end to end.
