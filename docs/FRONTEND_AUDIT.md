# Frontend Audit Notes

This document records frontend-specific cleanup findings for ChemicalSearch.

## Current frontend architecture

The frontend is a static site in `chemicalsearch-site/`. It does not use React, Vue, Vite, Next.js, or another build tool.

Main files:

```text
index.html          Static shell and script loading
runtime-config.js   Runtime API URL override setup
app-base.css        Base app styles extracted from app.js
styles.css          Overrides, final layout rules, and print rules
app.js              Main app rendering, routing, search, and detail views
autofill-client.js  Add/update chemical request form behavior and backend API calls
enhancements.js     Additional behavior layered onto the app
layout-fixes.js     Home-button behavior and SOJO logo placement helper
sds-data-*.js       Built-in chemical/SDS data loaded as global records
sds-approved.js     Approved records appended at runtime as global records
```

## Frontend cleanup status

The largest frontend cleanup issue has been addressed: styling is no longer embedded inside `index.html` or injected by `app.js`.

Current styling structure:

```text
1. app-base.css  Base app styling extracted from app.js
2. styles.css    Overrides, final layout rules, and print rules
```

This is more predictable than the earlier structure, where styling was split across `styles.css`, an inline `index.html` style block, and a dynamically injected `app.js` style block.

## Why Render and GitHub static pages may look different

Render serves `chemicalsearch-site/` as the site root. GitHub Pages may serve the repository root or a project subpath. If the hosting root is different, relative asset paths can resolve differently.

Render expected paths:

```text
/app-base.css
/styles.css
/runtime-config.js
/app.js
/autofill-client.js
/layout-fixes.js
/sds-data-1.js
```

GitHub Pages may need paths like:

```text
/chemicalsearch/chemicalsearch-site/app-base.css
/chemicalsearch/chemicalsearch-site/styles.css
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
7. Kept app behavior unchanged and verified manually after each step.
```

## Next cleanup recommendation

Do not redesign the UI yet. The best next frontend cleanup is to review JavaScript responsibilities.

Recommended remaining order:

```text
1. Review enhancements.js and autofill-client.js for duplicated DOM helpers.
2. Check whether layout-fixes.js can be simplified after app rendering is stable.
3. Add a lightweight browser smoke test only after the manual checklist stays stable.
```

## Risk level

The largest frontend styling risk has been reduced. Remaining frontend cleanup is medium risk because these files still affect routing, form behavior, and post-render DOM updates.

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
7. Home button visibility on non-home routes.
8. SOJO logo placement.
9. Mobile layout.
10. Print view if printing SDS summaries matters.
```

## Do not delete yet

Do not delete these without manual browser testing:

```text
enhancements.js
autofill-client.js
layout-fixes.js
app-base.css
styles.css
```

They affect visible behavior and workflow behavior.
