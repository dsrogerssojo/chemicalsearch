# ChemicalSearch Stable State

This checkpoint records the current non-secret production state so future cleanup can stay conservative.

## Production URLs

```text
Frontend: https://chemicalsearch-site.onrender.com
Backend:  https://chemicalsearch-backend.onrender.com
Health:   https://chemicalsearch-backend.onrender.com/health
```

A `Cannot GET /` response at the backend root is normal. Use `/health` for backend health checks.

## Current stable workflow

The approval flow has been manually tested and is considered working:

```text
User submits Add/Update Chemical request
Backend sends request to Power Automate
Teams Adaptive Card appears
Reviewer approves or denies
Power Automate calls backend review callback
Backend writes approved record to chemicalsearch-site/sds-approved.js through GitHub API
Backend triggers Render frontend deploy hook
Frontend redeploys
Approved chemical appears in search
```

Treat this workflow as fragile. Do not rewrite the backend approval, GitHub writeback, or deploy-hook path before adding automated tests or isolating a very small safe fix.

## Frontend cleanup completed

Completed frontend cleanup already verified after Render redeploys:

```text
1. Moved inline final layout/print CSS out of index.html and into styles.css.
2. Moved inline Home button/SOJO logo helper out of index.html and into layout-fixes.js.
3. Moved runtime API config out of index.html and into runtime-config.js.
4. Extracted app.js injected base CSS into app-base.css.
5. Removed the giant injected CSS payload from app.js.
6. Extracted SOJO theme CSS from the old enhancements layer into sojo-theme.css.
7. Removed enhancements.js from index.html.
8. Deleted enhancements.js.
9. Simplified layout-fixes.js so it reuses the existing logo instead of constantly removing/recreating it.
10. Fixed autofill-client.js so saved requests include both id and request_id.
```

## Current frontend ownership

```text
chemicalsearch-site/index.html          Static shell and style/script loading only
chemicalsearch-site/runtime-config.js   Runtime API URL override from localStorage
chemicalsearch-site/app-base.css        Base app styles extracted from old app.js injected CSS
chemicalsearch-site/styles.css          Layout overrides, final fixes, print styles, Home button styling
chemicalsearch-site/sojo-theme.css      SOJO-inspired visual theme
chemicalsearch-site/app.js              Main rendering, routing, search, detail views, fallback add/update route, request receipts
chemicalsearch-site/autofill-client.js  Production add/update form override, backend autofill, request submission, local request saving
chemicalsearch-site/layout-fixes.js     SOJO logo placement and Home button behavior
chemicalsearch-site/sds-data-*.js       Built-in SDS records
chemicalsearch-site/sds-approved.js     Approved records appended by the backend/GitHub approval workflow
```

## Backend safety warning

The backend files most directly involved in the working production workflow are:

```text
backend/server.js
backend/config.js
backend/sds-parser.js
backend/scripts/check-env.js
```

Do not rename environment variables, hardcode secrets, expose deploy hooks, or change the Power Automate/shared-secret/review-callback/GitHub-writeback path casually.

## Safe next cleanup steps

```text
1. Keep README.md, docs/FRONTEND_AUDIT.md, and docs/SMOKE_TEST.md current.
2. Add a lightweight local validation script that checks required frontend files exist and index.html references valid local files.
3. Keep backend npm run check passing.
4. Consider a small smoke test only after the manual checklist remains stable.
5. Split backend/server.js only after tests or a repeatable review-callback/writeback checkpoint exist.
```
