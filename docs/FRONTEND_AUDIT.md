# Frontend Audit Notes

This document records frontend-specific cleanup findings for ChemicalSearch.

## Current frontend architecture

The frontend is a static site in `chemicalsearch-site/`. It does not use React, Vue, Vite, Next.js, or another build tool.

Main files:

```text
index.html          Static shell and script/style loading only
runtime-config.js   Runtime API URL override setup from localStorage
app-base.css        Base app styles extracted from the old app.js injected style block
styles.css          Layout overrides, final fixes, print styles, and home button styling
sojo-theme.css      SOJO-inspired visual theme extracted from the old enhancements layer
app.js              Main app rendering, routing, search, detail views, fallback add/update route, and request receipt rendering
autofill-client.js  Production add/update chemical form, backend autofill calls, request submission, and local request saving
layout-fixes.js     SOJO logo placement and Home button behavior
sds-data-*.js       Built-in chemical/SDS data loaded as global records
sds-approved.js     Approved records appended at runtime as global records by the review workflow
```

## Frontend cleanup status

The largest frontend cleanup issue has been addressed: styling is no longer embedded inside `index.html` or injected by `app.js`.

Current styling structure:

```text
1. app-base.css   Base app styling extracted from app.js
2. styles.css     Layout overrides, final fixes, print styles, and Home button styling
3. sojo-theme.css SOJO-inspired visual theme extracted from the removed enhancements layer
```

This is more predictable than the earlier structure, where styling was split across `styles.css`, an inline `index.html` style block, a dynamically injected `app.js` style block, and an enhancements layer.

## Why Render and GitHub static pages may look different

Render serves `chemicalsearch-site/` as the site root. GitHub Pages may serve the repository root or a project subpath. If the hosting root is different, relative asset paths can resolve differently.

Render expected paths:

```text
/app-base.css
/styles.css
/sojo-theme.css
/runtime-config.js
/app.js
/autofill-client.js
/layout-fixes.js
/sds-data-1.js
/sds-approved.js
```

GitHub Pages may need paths like:

```text
/chemicalsearch/chemicalsearch-site/app-base.css
/chemicalsearch/chemicalsearch-site/styles.css
/chemicalsearch/chemicalsearch-site/sojo-theme.css
/chemicalsearch/chemicalsearch-site/app.js
```

If CSS or JavaScript fails to load, the page can look very different.

## Cleanup completed

Completed frontend cleanup:

```text
1. Moved index.html inline final layout/print styles into styles.css.
2. Moved index.html home-button/SOJO-logo script into layout-fixes.js.
3. Moved index.html runtime API setup into runtime-config.js.
4. Copied app.js injected base CSS into app-base.css.
5. Loaded app-base.css before styles.css.
6. Removed the injected app.js style payload after manual verification.
7. Extracted SOJO theme CSS into sojo-theme.css.
8. Removed enhancements.js from index.html.
9. Deleted enhancements.js after manual verification.
10. Kept app behavior unchanged and verified manually after each step.
```

## Next cleanup recommendation

Do not redesign the UI yet. The best next frontend cleanup is to review JavaScript responsibilities without changing behavior.

Recommended remaining order:

```text
1. Check index.html for stale script/style references before every deploy-affecting cleanup.
2. Map exactly how app.js and autofill-client.js share the add/update route before combining or moving form logic.
3. Check layout-fixes.js for duplicated or unnecessary behavior, but keep it if the SOJO logo and Home button are working.
4. Check autofill-client.js for duplicated localStorage/request ID behavior.
5. Add lightweight local validation that confirms index.html references existing local files.
6. Add a lightweight browser smoke test only after the manual checklist stays stable.
```

## Risk level

The largest frontend styling risk has been reduced. Remaining frontend cleanup is medium risk because these files still affect routing, form behavior, request persistence, and post-render DOM updates.

Use small commits and manually test after each one.

## Manual visual test checklist

After frontend styling changes, test:

```text
1. Home page layout.
2. Search bar width and button alignment.
3. Quick search chips.
4. Result cards.
5. Chemical detail page.
6. Add/update chemical page.
7. Autofill success and graceful failure behavior.
8. Request submission and receipt page.
9. Home button visibility on non-home routes.
10. SOJO logo placement.
11. Mobile layout.
12. Print view if printing SDS summaries matters.
```

## Do not delete yet

Do not delete these without manual browser testing:

```text
autofill-client.js
layout-fixes.js
app-base.css
styles.css
sojo-theme.css
runtime-config.js
sds-approved.js
```

They affect visible behavior, workflow behavior, runtime configuration, or approved-record loading.
