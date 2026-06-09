# ChemicalSearch Deployment Notes

ChemicalSearch currently uses Render for both the frontend and backend.

## Production URLs

```text
Frontend: https://chemicalsearch-site.onrender.com
Backend:  https://chemicalsearch-backend.onrender.com
Health:   https://chemicalsearch-backend.onrender.com/health
```

The backend root URL may return `Cannot GET /`. That is expected because the backend is an API service. Use `/health` to check whether the backend is running.

## Render services

### Backend service

```text
Service name: chemicalsearch-backend
Type: Web Service
Root directory: backend
Build command: npm install
Start command: npm start
```

### Frontend service

```text
Service name: chemicalsearch-site
Type: Static Site
Root directory: chemicalsearch-site
Build command: leave blank
Publish directory: .
```

## Required backend environment variables

The backend needs these variables for the full review workflow:

```text
POWER_AUTOMATE_WEBHOOK_URL
POWER_AUTOMATE_SHARED_SECRET
REVIEW_CALLBACK_SECRET
GITHUB_TOKEN
GITHUB_REPO
GITHUB_APPROVED_FILE
GITHUB_BRANCH
ALLOWED_ORIGINS
```

Recommended `ALLOWED_ORIGINS` value for production plus local testing:

```text
https://chemicalsearch-site.onrender.com,http://127.0.0.1:5500
```

Recommended variable for automatic frontend redeploys after approved chemicals:

```text
FRONTEND_DEPLOY_HOOK_URL
```

This should be the deploy hook URL from the Render `chemicalsearch-site` static site.

Optional search provider variables:

```text
BRAVE_SEARCH_API_KEY
GOOGLE_CSE_API_KEY
GOOGLE_CSE_CX
```

These optional search variables are not required for direct SDS/PDF parsing.

## Checking backend environment locally

From the backend folder:

```bash
npm run check:env
```

This prints whether important variables are present. It does not print secret values.

## Approved chemicals and redeploys

Approved chemical records are currently written into:

```text
chemicalsearch-site/sds-approved.js
```

Because the frontend is static, a newly approved chemical may not appear until the frontend static site redeploys.

Automatic redeploy support now exists. If `FRONTEND_DEPLOY_HOOK_URL` is set, the backend calls that Render deploy hook after a successful GitHub approved-record writeback.

If the deploy hook is not configured or the hook call fails, the approval still succeeds. The backend response includes a `frontend_deploy` object explaining whether the frontend redeploy was triggered.

Long-term recommendation:

Serve approved records from a backend API or database so frontend redeployment is not required for every approval.

## Creating the Render frontend deploy hook

In Render:

```text
1. Open chemicalsearch-site.
2. Go to Settings.
3. Find Deploy Hooks.
4. Create a deploy hook if one does not exist.
5. Copy the hook URL.
6. Open chemicalsearch-backend.
7. Add FRONTEND_DEPLOY_HOOK_URL as an environment variable.
8. Paste the hook URL as the value.
9. Save changes and redeploy the backend.
```

Do not commit the deploy hook URL to GitHub.

## Power Automate callback

Power Automate should send approval decisions to:

```text
https://chemicalsearch-backend.onrender.com/api/review-callback
```

The callback must include the review secret in this header:

```text
x-review-secret: <REVIEW_CALLBACK_SECRET>
```

For an approved chemical to be written into the static approved-data file, the callback payload must include at least:

```text
chemical.name or chemical.chemical_name
chemical.sds_url
```

If those are missing, the backend intentionally rejects the approval record.

## Deployment test checklist

After backend deploy:

```text
1. Open /health.
2. Confirm JSON says ok true.
3. Submit a test request from the frontend.
4. Confirm Power Automate receives it.
```

After frontend deploy:

```text
1. Open the frontend URL.
2. Hard refresh the page.
3. Search for an existing chemical.
4. Open the add/update chemical route.
5. Submit a test request.
```

## Common failures

### Failed to fetch from frontend

Likely causes:

```text
1. Backend is down.
2. Backend /health fails.
3. Frontend URL is missing from ALLOWED_ORIGINS.
4. Browser has an old localStorage API override.
```

Check browser console for:

```js
localStorage.getItem("chemicalsearch.apiBaseUrl")
```

Clear override if needed:

```js
localStorage.removeItem("chemicalsearch.apiBaseUrl")
```

### Approved chemical does not appear after approval

Likely causes:

```text
1. FRONTEND_DEPLOY_HOOK_URL is not set.
2. Render frontend deploy hook failed.
3. Static frontend redeploy is still running.
4. Browser cache still has the old approved data file.
```

Check the backend approval response for the `frontend_deploy` field.

### GitHub Pages looks different from Render

Render serves `chemicalsearch-site/` as the site root. GitHub Pages may serve from a different root or subpath. That can break relative CSS and JavaScript paths.

Use Render as the canonical production frontend unless GitHub Pages is intentionally configured and tested.
