# Chemical Safety Lookup Prototype

Mobile-first prototype for scanning a QR code, searching an internal chemical safety database, viewing SDS references, and requesting new chemical records by email review.

## Current Prototype

- Fast search by name, formula, CAS number, signal word, alias, or SDS keyword.
- Search filters for verified records, pending review, and high-risk hazards.
- Professional chemical cards with hazard rails, status badges, symptom preview, PPE preview, and source status.
- Chemical detail pages with hazards, PPE, storage, disposal, SDS links, and source verification.
- Less emergency-focused library interface with exposure guidance kept as secondary context.
- Add Chemical form that creates a structured review request and opens a prefilled email.
- Email request receipt page so the requester can reopen the review email.

## Data Source Options

There is no single free source that provides complete, authoritative SDS coverage for all chemicals. SDS documents are often manufacturer- and product-specific.

Useful public sources for enrichment:

- [PubChem PUG REST](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) / [PUG View](https://pubchem.ncbi.nlm.nih.gov/docs/pug-view): identifiers, synonyms, formulas, GHS-style safety summaries, LCSS pages, and source links.
- [EPA CompTox Chemicals Dashboard](https://www.epa.gov/comptox-tools/comptox-chemicals-dashboard) and [Computational Toxicology and Exposure APIs](https://www.epa.gov/comptox-tools/computational-toxicology-and-exposure-apis-about): chemical identifiers, synonyms, structures, curated metadata, and API access. EPA says API keys are free but require contacting the support team.
- [NIOSH Pocket Guide](https://www.cdc.gov/niosh/npg/default.html): strong occupational exposure and safety reference, but not a broad universal API for every chemical.

For production SDS workflows, use your internal SDS database or a commercial SDS management provider/API, then store approved SDS links in your internal database.

## Recommended Build Path

### Fast launch

- Static frontend hosted on Netlify or Vercel.
- Supabase for Postgres, authentication, admin roles, file attachments, audit fields, and row-level security.
- Serverless email endpoint using Resend, SendGrid, Mailgun, Microsoft Graph, or Google Workspace.
- QR code points to the public search URL or a location-specific URL.

### Scalable launch

- Next.js frontend on Vercel.
- Supabase Postgres with admin auth, review workflow, and audit logs.
- Server-side import workers for allowlisted sources only.
- Source snapshots stored with every import.
- Separate emergency contact sets by lab, campus, or facility.

## Accounts And Keys

- Vercel or Netlify hosting account.
- Supabase project and service role key for server-side review/import jobs.
- Domain name and QR code generator.
- Optional email/SMS provider for admin alerts.
- Public source integration access where available.

## Core Tables

### chemicals

- id
- name
- aliases
- formula
- cas_number
- hazard_level
- hazards
- symptoms
- first_aid
- ppe
- storage
- disposal
- emergency_contacts
- source_links
- sds_url
- sds_keywords
- verification_status: verified, unverified, pending_review
- verified_by
- reviewed_at
- created_at
- updated_at

### missing_chemical_requests

- id
- chemical_name
- cas_number
- exposure_type
- user_notes
- status
- created_at

### add_chemical_requests

- id
- chemical_name
- formula
- cas_number
- manufacturer
- sds_url
- requested_by
- notes
- status
- review_email
- created_at

### source_imports

- id
- chemical_id
- source_name
- source_url
- imported_data
- imported_at

## Unverified Import Rules

- Search only allowlisted trusted sources.
- Never generate or infer first-aid/treatment text.
- Save imported data as pending review.
- Show an unverified warning banner on every temporary profile.
- Store source links and raw imported data.
- Require admin approval before a record becomes verified.

## Email Review

- Prototype: opens a prefilled email to `safety-review@example.com`.
- Production: submit the form to a backend endpoint that sends the email and writes the request to the database.
- Approval links should be signed, expiring URLs that update request status only after reviewer authentication.
- Approved records should be added to the internal chemical database as pending or verified according to your review policy.

## Prototype Files

- `index.html`: app shell.
- `styles.css`: responsive mobile-first interface.
- `app.js`: mock database, search, SDS references, add-chemical email requests, and request receipts.
- `package.json`: local run scripts.
- `tools/server.mjs`: no-dependency local web server.
- `.github/workflows/pages.yml`: GitHub Pages deployment workflow.
- `SETUP.md`: local and GitHub setup instructions.

Open `index.html` directly in a browser to run this dependency-free prototype.

For another computer or GitHub Pages deployment, follow `SETUP.md`.
