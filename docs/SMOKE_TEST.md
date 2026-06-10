# ChemicalSearch Manual Smoke Test

Use this checklist after each frontend, backend, or workflow cleanup.

## Backend health

```text
1. Open https://chemicalsearch-backend.onrender.com/health
2. Confirm the response is JSON.
3. Confirm it says ok true.
```

Expected:

```json
{"ok":true,"service":"chemicalsearch-backend"}
```

A `Cannot GET /` response at the backend root is normal. Use `/health` for health checks.

## Frontend load

```text
1. Open https://chemicalsearch-site.onrender.com
2. Hard refresh the page.
3. Confirm the home page loads without a blank screen.
4. Confirm the SOJO theme/colors are applied.
5. Confirm the SOJO logo appears.
6. Confirm the Home button is hidden on the home page.
```

Hard refresh:

```text
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

## Search flow

```text
1. Search for a known chemical.
2. Confirm results appear.
3. Confirm quick search chips still populate results.
4. Confirm chemical cards look correct and are clickable.
5. Open a result card.
6. Confirm the detail page renders.
7. Confirm the Home button appears on the detail page.
8. Click Home and confirm it returns to the home/search page.
```

## Add/update chemical flow

```text
1. Open https://chemicalsearch-site.onrender.com/#/add-chemical
2. Confirm the add/update form loads.
3. Enter a test product name and SDS URL.
4. Confirm autofill either fills useful fields or fails with a clear graceful message.
5. Submit the request.
6. Confirm the request is accepted.
7. Confirm the receipt page loads for the submitted request.
```

## Teams approval flow

```text
1. Confirm the Teams adaptive card appears.
2. Approve the test request.
3. Confirm the Power Automate HTTP callback returns status 200.
4. Confirm the callback response includes ok true.
5. Confirm GitHub updates chemicalsearch-site/sds-approved.js.
6. Confirm Render triggers a frontend redeploy.
7. After deploy finishes, hard refresh the frontend.
8. Search for the newly approved chemical.
9. Confirm the approved chemical appears in search results.
10. Open the approved chemical detail page.
```

## Frontend visual checks

```text
1. Home page layout still looks correct.
2. Search bar and Search button align correctly.
3. Quick search chips still wrap correctly.
4. SOJO logo is in the expected place.
5. SOJO theme/colors still apply.
6. Home button is hidden on the home page.
7. Home button appears on non-home pages.
8. Add/update form still looks usable.
9. Autofill status banners are readable.
10. Receipt page is readable.
11. Approved chemical records appear after redeploy.
```

## Browser console checks

Open DevTools and confirm there are no new errors for:

```text
app-base.css
styles.css
sojo-theme.css
runtime-config.js
app.js
autofill-client.js
layout-fixes.js
sds-data files
sds-approved.js
```

## Backend API checks after backend changes

Run these manually after backend code changes:

```text
1. GET /health returns ok true.
2. POST /api/autofill succeeds or returns a useful validation/error response.
3. POST /api/submit-request sends a request to the Teams workflow.
4. Teams Adaptive Card appears.
5. POST /api/review-callback accepts a valid approved/denied callback.
6. Approved callback writes to chemicalsearch-site/sds-approved.js through GitHub.
7. Frontend deploy hook runs after GitHub writeback.
8. Approved chemical appears in frontend search after redeploy.
```

## When a test fails

```text
1. Stop making new cleanup changes.
2. Identify the most recent commit.
3. Check whether the failure is frontend, backend, Power Automate, GitHub writeback, or Render deploy.
4. Fix only the smallest failing part.
5. Run this checklist again.
```
