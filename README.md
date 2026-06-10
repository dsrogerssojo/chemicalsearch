# ChemicalSearch

ChemicalSearch is a small chemical/SDS lookup web app. It has a static browser frontend and a Node/Express backend that supports SDS autofill, missing-chemical requests, Power Automate review, and approved-record writeback.

This repository was built quickly and is still being stabilized. Treat autofill as a review aid, not as an authoritative safety source.

## Tech stack

- Frontend: vanilla HTML, CSS, and JavaScript
- Backend: Node.js, Express
- Package manager: npm
- Deployment: Render static site plus Render web service
- Workflow integration: Microsoft Power Automate and Teams
- External data helpers: PubChem lookup and optional SDS search APIs

## Repository layout

```text
chemicalsearch-site/      Static frontend files
backend/                  Node/Express backend API
backend/data/             Local approved-record fallback data, ignored by git
docs/                     Cleanup notes and maintenance documentation
render.yaml               Render deployment blueprint
README.md                 Project documentation
```

Important frontend files:

```text
chemicalsearch-site/index.html          Main frontend entry point and script loading
chemicalsearch-site/styles.css          Main stylesheet and layout overrides
chemicalsearch-site/app.js              Main app/routing/search logic
chemicalsearch-site/autofill-client.js  Add/update chemical request form and autofill behavior
chemicalsearch-site/enhancements.js     Additional frontend behavior
chemicalsearch-site/layout-fixes.js     Home button and SOJO logo layout helper
chemicalsearch-site/sds-data-*.js       Built-in SDS record data
chemicalsearch-site/sds-approved.js     Approved records generated from review workflow
```

Important backend files:

```text
backend/server.js              Express API routes and integration logic
backend/sds-parser.js          SDS parsing helper functions
backend/config.js              Shared backend configuration constants
backend/scripts/check-env.js   Environment configuration checker
backend/package.json           Backend npm scripts and dependencies
backend/.env.example           Example backend environment variables
```

Useful maintenance docs:

```text
docs/CLEANUP_AUDIT.md      Repository cleanup findings
docs/DEPLOYMENT.md         Render, Power Automate, and deploy-hook notes
docs/FRONTEND_AUDIT.md     Frontend architecture and styling cleanup notes
docs/SMOKE_TEST.md         Manual smoke-test checklist after changes
```

## Main user flows

1. User searches existing chemicals in the frontend.
2. User opens the add/update chemical form if a product is missing.
3. Optional autofill tries to use a product name, CAS number, SDS link, or other partial information.
4. User submits the request for supervisor review.
5. Backend sends the request to Power Automate.
6. Reviewer approves or denies in Teams.
7. If approved, backend writes the approved record into GitHub.
8. Frontend redeploys or reloads updated approved data before the new chemical appears.

## Local backend setup

From the repository root:

```bash
cd backend
npm install
npm run dev
```

Health check:

```text
http://localhost:3001/health
```

Expected response:

```json
{"ok":true,"service":"chemicalsearch-backend"}
```

## Backend scripts

Run these from the `backend/` folder:

```bash
npm run dev
npm start
npm run check
npm run check:env
```

Script purpose:

```text
npm run dev        Start the backend locally
npm start          Start the backend for deployment
npm run check      Syntax-check backend JavaScript files
npm run check:env  Print which important environment variables are configured
```

## Local frontend setup

The frontend is a static site. You can run it with VS Code Live Server or another static file server.

Typical local URL:

```text
http://127.0.0.1:5500/chemicalsearch-site/index.html
```

The frontend defaults to the Render backend:

```text
https://chemicalsearch-backend.onrender.com
```

For local backend testing, set this in the browser console:

```js
localStorage.setItem("chemicalsearch.apiBaseUrl", "http://localhost:3001")
```

To clear that override:

```js
localStorage.removeItem("chemicalsearch.apiBaseUrl")
```

## Backend environment variables

See `backend/.env.example` for the current list.

Common variables:

```text
PORT
ALLOWED_ORIGINS
POWER_AUTOMATE_WEBHOOK_URL
POWER_AUTOMATE_SHARED_SECRET
REVIEW_CALLBACK_SECRET
GITHUB_TOKEN
GITHUB_REPO
GITHUB_APPROVED_FILE
GITHUB_BRANCH
FRONTEND_DEPLOY_HOOK_URL
BRAVE_SEARCH_API_KEY        optional
GOOGLE_CSE_API_KEY          optional
GOOGLE_CSE_CX               optional
```

Do not commit real secrets or API keys.

## Render deployment

Backend service:

```text
Name: chemicalsearch-backend
Root directory: backend
Build command: npm install
Start command: npm start
```

Frontend static site:

```text
Name: chemicalsearch-site
Root directory: chemicalsearch-site
Build command: leave blank
Publish directory: .
```

The backend `ALLOWED_ORIGINS` variable must include the frontend URL. Example:

```text
https://chemicalsearch-site.onrender.com,http://127.0.0.1:5500
```

## Known limitations

- SDS autofill is best-effort only.
- JavaScript-rendered SDS viewer pages may not expose full SDS text to the backend.
- Scanned/image-only PDFs require OCR and may not parse correctly.
- Approved records are currently written to a static frontend JS file, so the frontend must redeploy or reload updated approved data before newly approved chemicals appear.
- There is not yet a formal automated test suite.

## Manual test checklist

Before considering a deployment healthy, manually test the workflow in `docs/SMOKE_TEST.md`.

Quick checklist:

```text
1. Backend health endpoint returns ok.
2. Frontend loads on Render.
3. Existing chemical search works.
4. Add/update chemical form opens.
5. Blank or partial request can be submitted.
6. Teams approval card appears.
7. Approved request updates GitHub.
8. Frontend redeploy shows approved chemical.
9. Failed autofill still allows manual request submission.
```

## Cleanup roadmap

Short term:

```text
1. Keep configuration and documentation accurate.
2. Split backend/server.js into smaller route and service modules.
3. Clarify frontend file responsibilities.
4. Add a minimal smoke test or health-check script.
5. Improve approval data storage so frontend redeploys are not required manually.
```

Do not make large rewrites until the main workflows are covered by tests or a repeatable manual checklist.
