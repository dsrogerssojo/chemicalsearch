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

## Frontend load

```text
1. Open https://chemicalsearch-site.onrender.com
2. Hard refresh the page.
3. Confirm the home page loads without a blank screen.
4. Confirm the SOJO logo appears.
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
3. Open a result card.
4. Confirm the detail page renders.
5. Confirm the Home button appears on the detail page.
6. Click Home and confirm it returns to the home/search page.
```

## Add/update chemical flow

```text
1. Open https://chemicalsearch-site.onrender.com/#/add-chemical
2. Confirm the form loads.
3. Enter a test product name and SDS URL.
4. Submit the request.
5. Confirm the request is accepted.
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
```

## Frontend visual checks

```text
1. Home page layout still looks correct.
2. Search bar and Search button align correctly.
3. Quick search chips still wrap correctly.
4. SOJO logo is in the expected place.
5. Home button is hidden on the home page.
6. Home button appears on non-home pages.
7. Add/update form still looks usable.
8. Approved chemical records appear after redeploy.
```

## Browser console checks

Open DevTools and confirm there are no new errors for:

```text
styles.css
app.js
enhancements.js
autofill-client.js
layout-fixes.js
sds-data files
sds-approved.js
```

## When a test fails

```text
1. Stop making new cleanup changes.
2. Identify the most recent commit.
3. Check whether the failure is frontend, backend, Power Automate, GitHub writeback, or Render deploy.
4. Fix only the smallest failing part.
5. Run this checklist again.
```
