# Frontend Audit Notes

This document records frontend-specific cleanup findings for ChemicalSearch.

## Current frontend architecture

The frontend is a static site in `chemicalsearch-site/`. It does not use React, Vue, Vite, Next.js, or another build tool.

Main files:

```text
index.html          Static shell, script loading, inline final layout/print styles, home-button/logo script
app.js              Main app rendering, routing, search, detail views, injected base CSS
autofill-client.js  Add/update chemical request form behavior and backend API calls
enhancements.js     Additional behavior layered onto the app
styles.css          Small CSS override file, not the main stylesheet
sds-data-*.js       Built-in chemical/SDS data loaded as global records
sds-approved.js     Approved records appended at runtime as global records
```

## Biggest frontend issue

The biggest issue is that styling is split across three places:

```text
1. styles.css
2. index.html inline <style>
3. app.js injected <style>
```

This makes the visual system fragile. The file named `styles.css` is not actually the full stylesheet; most base styles are generated dynamically by JavaScript in `app.js`.

This can cause the site to look different between Render, GitHub Pages, local Live Server, or browser cache states.

## Why Render and GitHub static pages may look different

Render serves `chemicalsearch-site/` as the site root. GitHub Pages may serve the repository root or a project subpath. If the hosting root is different, relative asset paths can resolve differently.

Render expected paths:

```text
/styles.css
/app.js
/autofill-client.js
/sds-data-1.js
```

GitHub Pages may need paths like:

```text
/chemicalsearch/chemicalsearch-site/styles.css
/chemicalsearch/chemicalsearch-site/app.js
```

If CSS or JavaScript fails to load, the page can look very different.

## Cleanup recommendation

Do not redesign the UI yet. First make styling predictable.

Recommended order:

```text
1. Leave all current styling in place.
2. Copy injected base CSS from app.js into styles.css.
3. Verify Render visually matches before and after.
4. Remove the injected app.js style block only after verification.
5. Move index.html inline style into styles.css.
6. Move index.html home-button/logo script into a separate file only after CSS is stable.
```

## Risk level

Moving CSS is medium risk because selector order and `!important` rules currently matter.

Do not move all CSS in one commit. Use several small commits and manually test after each one.

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
inline style block in index.html
inline script block in index.html
injected style block in app.js
```

They are messy, but they likely affect visible behavior.
