# Setup

This project is a static website. It can run locally, on another computer, or on GitHub Pages.

## Run On Another Computer

1. Install Node.js 20 or newer.
2. Download or clone this project.
3. Open a terminal in the project folder.
4. Run:

```bash
npm start
```

5. Open:

```text
http://localhost:4173
```

You can also open `index.html` directly in a browser, but the local server is closer to how the site will run when hosted.

## Publish To GitHub

If Git is installed:

```bash
git init
git add .
git commit -m "Initial chemical safety lookup site"
git branch -M main
git remote add origin https://github.com/YOUR-USER/chemical-safety-lookup.git
git push -u origin main
```

Then enable GitHub Pages:

1. Open the repository on GitHub.
2. Go to Settings.
3. Go to Pages.
4. Select GitHub Actions as the source.
5. The included workflow will publish the site after the next push.

## Email Review Address

The Add Chemical request flow currently opens a prefilled email to:

```text
safety-review@example.com
```

Change this in `app.js`:

```js
const REVIEW_EMAIL = "safety-review@example.com";
```

## Internal Database

The current chemical records are embedded in `app.js` for a simple prototype. When you provide the internal database, the next step should be to move records into a separate `data/chemicals.json` file or connect a real database such as Supabase.
