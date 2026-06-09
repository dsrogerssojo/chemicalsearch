# ChemicalSearch Cleanup Audit

This document records the current repository cleanup findings and the safest order of work.

## Project summary

ChemicalSearch is a static chemical/SDS lookup website with a Node/Express backend.

The app appears to support these workflows:

1. Search built-in SDS/chemical records.
2. View product details and SDS references.
3. Submit a missing or updated chemical request.
4. Optionally autofill request fields from SDS links, PubChem, or search providers.
5. Send requests to Power Automate/Teams for review.
6. Accept a review callback and write approved records back to GitHub.

## Current architecture

```text
chemicalsearch-site/      Browser frontend, static assets, SDS data files
backend/                  Express backend API
render.yaml               Render deployment blueprint
README.md                 Developer setup and deployment documentation
```

### Frontend

The frontend is plain HTML/CSS/JavaScript. There is no framework build step.

Important files:

```text
chemicalsearch-site/index.html
chemicalsearch-site/app.js
chemicalsearch-site/autofill-client.js
chemicalsearch-site/enhancements.js
chemicalsearch-site/styles.css
chemicalsearch-site/sds-data-*.js
chemicalsearch-site/sds-approved.js
```

### Backend

The backend is Node.js with Express.

Important files:

```text
backend/server.js
backend/sds-parser.js
backend/package.json
backend/.env.example
```

## Major findings

### 1. CSS is split across three places

Current styling exists in:

```text
chemicalsearch-site/styles.css
chemicalsearch-site/index.html inline <style>
chemicalsearch-site/app.js injected <style>
```

This is fragile because the site appearance depends on JavaScript injecting CSS at runtime. It also explains why different static deployments can look different if assets are served from different paths, different commits, or different cache states.

Recommendation:

Move stable CSS into `styles.css` gradually. Do not remove injected CSS all at once. First copy styles into `styles.css`, verify visually, then remove the injected block later.

Risk level: Medium.

### 2. `backend/server.js` has too many responsibilities

The backend server currently handles:

```text
Express app setup
CORS
request normalization
autofill orchestration
PubChem lookup
SDS search lookup
Power Automate submission
review callback validation
approved record normalization
local approved-record storage
GitHub commit-back behavior
```

This makes the file hard to maintain and increases the chance of breaking unrelated behavior when editing one feature.

Recommendation:

Split into small modules, preserving behavior:

```text
backend/server.js
backend/config.js
backend/routes/autofill.js
backend/routes/requests.js
backend/routes/review-callback.js
backend/services/github-approved-records.js
backend/services/power-automate.js
backend/services/pubchem.js
backend/services/sds-search.js
backend/utils/chemical-records.js
backend/sds-parser.js
```

Risk level: Medium. Refactor one route/service at a time.

### 3. Approved records are stored as generated frontend JavaScript

Approved chemicals are written into:

```text
chemicalsearch-site/sds-approved.js
```

This works, but it couples backend approval logic to static frontend deployment. New approved chemicals may not appear until the frontend redeploys.

Recommendation:

Short term: trigger a frontend redeploy after approval.

Long term: serve approved records from a backend API or database so the frontend does not need redeployment for every approval.

Risk level: Medium.

### 4. Autofill should be treated as best-effort only

The current SDS parsing approach works best for direct, text-readable PDFs or simple HTML SDS pages. It will fail or produce partial output for:

```text
JavaScript-rendered SDS viewers
scanned PDFs
blocked vendor sites
viewer pages that hide the real SDS document
ambiguous product names
```

Recommendation:

Keep user-facing warnings. Improve parser observability before adding complexity: log source type, extracted field count, readable text length, and discovered embedded links.

Risk level: Low for observability, High for major parsing changes.

### 5. No automated test baseline

There is currently a backend syntax check script, but no formal test suite.

Current backend script:

```bash
npm run check
```

Recommendation:

Add minimal smoke tests later. Start with tests for pure helper functions, especially SDS parsing and approved-record normalization.

Risk level: Low.

## Safe cleanup already completed

- Added `.gitignore` to ignore dependencies, environment files, logs, local runtime data, and editor noise.
- Added root `README.md` with setup, deployment notes, known limitations, and manual test checklist.
- Added this cleanup audit document.

## Do not delete yet

The following should not be deleted without deeper inspection:

```text
chemicalsearch-site/enhancements.js
chemicalsearch-site/autofill-client.js
chemicalsearch-site/sds-approved.js
backend/data/approved-chemicals.json
```

These appear to be involved in runtime behavior or deployment workflow.

## Recommended cleanup order

### Phase 1: Documentation and config

- Keep README accurate.
- Confirm `.env.example` matches backend variables.
- Confirm Render environment variables are documented.
- Confirm `render.yaml` matches actual Render services.

### Phase 2: Backend readability

- Reformat long one-line functions in `backend/server.js`.
- Extract config constants into `backend/config.js`.
- Extract GitHub writeback into `backend/services/github-approved-records.js`.
- Extract Power Automate submission into `backend/services/power-automate.js`.
- Extract route handlers one at a time.

### Phase 3: Frontend styling cleanup

- Move injected CSS from `app.js` into `styles.css` carefully.
- Move inline CSS from `index.html` into `styles.css` carefully.
- Keep visual behavior unchanged.
- Test Render frontend after every styling change.

### Phase 4: Frontend logic cleanup

- Identify the responsibilities of `app.js`, `autofill-client.js`, and `enhancements.js`.
- Move shared formatting/data helpers into a small utility file only if it reduces duplication.
- Avoid introducing a frontend framework.

### Phase 5: Approval workflow reliability

- Decide whether approved records should remain in `sds-approved.js`.
- Add automatic Render frontend deploy hook after successful GitHub writeback, or move approved data to an API-backed runtime fetch.

### Phase 6: Tests

- Add small tests for SDS parser behavior.
- Add tests for approved chemical normalization.
- Add a smoke test for `/health`.

## Manual test checklist

After any cleanup commit, test:

```text
1. Backend deploy succeeds.
2. /health returns ok.
3. Frontend loads on Render.
4. Existing chemical search works.
5. Chemical detail page opens.
6. Add chemical form opens.
7. Blank/partial request submits.
8. Teams approval card appears.
9. Approved request writes to GitHub.
10. Approved chemical appears after frontend redeploy.
11. Autofill failure does not block manual submission.
```

## Remaining risks

- Refactoring `server.js` could break Power Automate callbacks if request/response shapes change.
- Moving CSS out of JavaScript could change page appearance if selectors or cascade order differ.
- Removing any frontend script may break routing or autofill behavior.
- Approved data currently depends on static frontend deployment, so users may not see newly approved chemicals immediately.
