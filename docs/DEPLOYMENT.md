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

Short-term options:

```text
1. Manually redeploy the Render static frontend after approvals.
2. Add a Render deploy hook and have the backend call it after successful GitHub writeback.
```

Long-term recommendation:

Serve approved records from a backend API or database so frontend redeployment is not required for every approval.

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

### GitHub Pages looks different from Render

Render serves `chemicalsearch-site/` as the site root. GitHub Pages may serve from a different root or subpath. That can break relative CSS and JavaScript paths.

Use Render as the canonical production frontend unless GitHub Pages is intentionally configured and tested.
