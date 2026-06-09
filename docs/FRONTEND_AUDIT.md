# Frontend Audit Notes

This document records frontend-specific cleanup findings for ChemicalSearch.

## Current frontend architecture

The frontend is a static site in `chemicalsearch-site/`. It does not use React, Vue, Vite, Next.js, or another build tool.

Main files:

```text
index.html          Static shell and script loading
app.js              Main app rendering, routing, search, detail views, injected base CSS
autofill-client.js  Add/update chemical request form behavior and backend API calls
enhancements.js     Additional behavior layered onto the app
layout-fixes.js     Home-button behavior and SOJO logo placement helper
styles.css          Stylesheet for overrides, final layout rules, and print rules
sds-data-*.js       Built-in chemical/SDS data loaded as global records
sds-approved.js     Approved records appended at runtime as global records
```

## Biggest frontend issue

The biggest remaining issue is that styling is split across two places:

```text
1. styles.css
2. app.js injected <style>
```

Earlier cleanup moved the former `index.html` inline `<style>` block into `styles.css`. The file named `styles.css` now contains more of the visible layout and print styling, but most base styles are still generated dynamically by JavaScript in `app.js`.

This can cause the site to look different between Render, GitHub Pages, local Live Server, or browser cache states.

## Why Render and GitHub static pages may look different

Render serves `chemicalsearch-site/` as the site root. GitHub Pages may serve the repository root or a project subpath. If the hosting root is different, relative asset paths can resolve differently.

Render expected paths:

```text
/styles.css
/app.js
/autofill-client.js
/layout-fixes.js
/sds-data-1.js
```

GitHub Pages may need paths like:

```text
/chemicalsearch/chemicalsearch-site/styles.css
/chemicalsearch/chemicalsearch-site/app.js
```

If CSS or JavaScript fails to load, the page can look very different.

## Cleanup completed

Completed frontend cleanup:

```text
1. Moved index.html inline final layout/print styles into styles.css.
2. Moved index.html home-button/SOJO-logo script into layout-fixes.js.
3. Kept app behavior unchanged and verified manually after each step.
```

## Next cleanup recommendation

Do not redesign the UI yet. First make styling predictable.

Recommended remaining order:

```text
1. Copy injected base CSS from app.js into styles.css.
2. Verify Render visually matches before and after.
3. Remove the injected app.js style block only after verification.
4. Review enhancements.js and autofill-client.js for duplicated DOM helpers.
```

## Risk level

Moving the remaining injected CSS is medium risk because selector order and `!important` rules currently matter.

Do not move all remaining CSS and app logic in one untested change. Use small commits and manually test after each one.

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
injected style block in app.js
```

They are messy, but they likely affect visible behavior.
