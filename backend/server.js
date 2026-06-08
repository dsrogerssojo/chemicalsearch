import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  clean,
  discoverEmbeddedSdsLinks,
  extractSdsFields,
  fetchReadableText,
  fieldCount,
  mergeMissingFields
} from './sds-parser.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.resolve('data');
const LOCAL_APPROVED_PATH = path.join(DATA_DIR, 'approved-chemicals.json');
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
const TRUSTED_SDS_DOMAINS = ['chemicalsafety.com','cloroxpro.com','thecloroxcompany.com','diversey.com','ecolab.com','grainger.com','sds.chemtel.net','fisher.com','fishersci.com','sigmaaldrich.com','uline.com','img.uline.com','simplegreen.com','cdn.simplegreen.com','rbnainfo.com','crcindustries.com','markem-imaje.com','wd40.com','homedepot-static.com','images.thdstatic.com'];
const CAS_SINGLE_PATTERN = /\b\d{2,7}-\d{2}-\d\b/;

app.use(cors({ origin(origin, callback) { if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return callback(null, true); return callback(new Error(`Origin not allowed: ${origin}`)); } }));
app.use(express.json({ limit: '2mb' }));

function firstUseful(...values) { return values.map(clean).find(Boolean) || ''; }
function slugify(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `chemical-${Date.now()}`; }
function buildLookupTerm(fields = {}) { return firstUseful(fields.chemical_name, fields.product_name, fields.cas_number, fields.composition, fields.product_code, fields.manufacturer, fields.sds_url); }
function isTrustedSdsUrl(url = '') { try { const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); return TRUSTED_SDS_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`)); } catch { return false; } }

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { Accept: 'application/json', 'User-Agent': 'ChemicalSearchBackend/1.0', ...(options.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function lookupSubmittedSds(url) {
  if (!clean(url)) return null;
  const notes = [`Parsed submitted SDS link: ${url}`];
  const links = [{ label: 'Submitted SDS', url }];
  const primaryText = await fetchReadableText(url);
  const fields = extractSdsFields(primaryText, url);

  if (fieldCount(fields) < 2) {
    const embeddedLinks = discoverEmbeddedSdsLinks(primaryText, url);
    if (embeddedLinks.length) notes.push(`Found ${embeddedLinks.length} embedded SDS/PDF link(s) inside the submitted page.`);
    for (const embeddedUrl of embeddedLinks) {
      try {
        const embeddedText = await fetchReadableText(embeddedUrl);
        const embeddedFields = extractSdsFields(embeddedText, embeddedUrl);
        const before = fieldCount(fields);
        mergeMissingFields(fields, embeddedFields);
        links.push({ label: 'Embedded SDS/PDF', url: embeddedUrl });
        const gained = fieldCount(fields) - before;
        if (gained > 0) notes.push(`Extracted ${gained} additional field(s) from embedded SDS/PDF.`);
        if (fieldCount(fields) >= 4) break;
      } catch (error) {
        notes.push(`Could not read embedded SDS/PDF link: ${error.message}`);
      }
    }
  }

  const extractedCount = fieldCount(fields);
  notes.push(extractedCount ? `Extracted ${extractedCount} field(s) from SDS text/metadata.` : 'Read the SDS link, but could not extract structured fields from its text, metadata, or embedded links. It may be scanned, blocked, or rendered by JavaScript only.');
  notes.push('Verify all extracted values against the visible SDS before submitting.');
  return { confidence: isTrustedSdsUrl(url) ? Math.min(0.97, 0.72 + extractedCount * 0.05) : Math.min(0.86, 0.55 + extractedCount * 0.06), source: 'Submitted SDS document', source_type: 'sds_document_parse', fields, notes, links };
}

function findCas(synonyms = []) { return synonyms.map(clean).find((item) => CAS_SINGLE_PATTERN.test(item)) || ''; }
async function lookupPubChem(term) {
  if (!term || /^https?:\/\//i.test(term)) return null;
  const encoded = encodeURIComponent(term);
  const cidData = await fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`);
  const cid = cidData?.IdentifierList?.CID?.[0];
  if (!cid) return null;
  const [propertiesData, synonymsData] = await Promise.all([
    fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON`),
    fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`).catch(() => null)
  ]);
  const properties = propertiesData?.PropertyTable?.Properties?.[0] || {};
  return { confidence: CAS_SINGLE_PATTERN.test(term) ? 0.82 : 0.7, source: 'PubChem', source_type: 'chemical_identity', fields: { chemical_name: firstUseful(properties.Title, term), cas_number: findCas(synonymsData?.InformationList?.Information?.[0]?.Synonym || []), composition: properties.MolecularFormula || '' }, notes: [`PubChem CID ${cid}`, `PubChem URL: https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`, properties.IUPACName ? `IUPAC name: ${properties.IUPACName}` : '', properties.MolecularWeight ? `Molecular weight: ${properties.MolecularWeight}` : '', 'Chemical identity only. Product-specific SDS, supplier, and product code require official SDS verification.'].filter(Boolean), links: [{ label: 'PubChem', url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}` }] };
}

function buildSearchQuery(term, fields = {}) { return [firstUseful(fields.chemical_name, fields.product_name, term), fields.product_code, fields.manufacturer, 'SDS PDF safety data sheet'].filter(Boolean).join(' '); }
function parseSearchResults(results, provider, query) {
  const candidates = results.map((item) => ({ title: item.title || 'SDS result', url: item.url || item.link || '', description: item.description || item.snippet || '' })).filter((item) => item.url);
  const best = candidates.find((item) => isTrustedSdsUrl(item.url)) || candidates.find((item) => /\.pdf($|\?)/i.test(item.url)) || candidates[0];
  if (!best) return { confidence: 0.2, source: provider, source_type: 'sds_search', fields: {}, notes: [`No SDS search result found for: ${query}`], links: [] };
  return { confidence: isTrustedSdsUrl(best.url) ? 0.78 : /\.pdf($|\?)/i.test(best.url) ? 0.62 : 0.48, source: provider, source_type: 'sds_search', fields: { sds_url: best.url }, notes: [`Possible SDS result from ${provider}: ${best.title}`, best.description, isTrustedSdsUrl(best.url) ? 'Domain is on the trusted SDS/source allowlist.' : 'Result requires manual verification before use.'].filter(Boolean), links: candidates.slice(0, 5).map((item) => ({ label: item.title, url: item.url })) };
}
async function lookupSdsSearch(term, fields = {}) {
  const query = buildSearchQuery(term, fields);
  if (process.env.BRAVE_SEARCH_API_KEY) return parseSearchResults((await fetchJson(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, { headers: { 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY } }))?.web?.results || [], 'Brave Search', query);
  if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) {
    const data = await fetchJson(`https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(process.env.GOOGLE_CSE_API_KEY)}&cx=${encodeURIComponent(process.env.GOOGLE_CSE_CX)}&q=${encodeURIComponent(query)}&num=5`);
    return parseSearchResults((data?.items || []).map((item) => ({ title: item.title, url: item.link, description: item.snippet })), 'Google Custom Search', query);
  }
  return { confidence: 0.25, source: 'SDS search not configured', source_type: 'sds_search_guidance', fields: {}, notes: ['Product-specific SDS search requires a search API key. Direct SDS/PDF parsing still works without one.'], links: [{ label: 'Manual SDS search', url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }] };
}

function mergeCandidates(candidates = []) {
  const merged = { confidence: 0, fields: {}, notes: [], sources: [], links: [], needs_verification: true };
  for (const candidate of candidates.filter(Boolean)) {
    merged.confidence = Math.max(merged.confidence, candidate.confidence || 0);
    merged.sources.push({ source: candidate.source, source_type: candidate.source_type, confidence: candidate.confidence });
    Object.entries(candidate.fields || {}).forEach(([key, value]) => { if (!clean(merged.fields[key]) && clean(value)) merged.fields[key] = value; });
    merged.notes.push(...(candidate.notes || []));
    merged.links.push(...(candidate.links || []));
  }
  merged.notes = [...new Set(merged.notes.map(clean).filter(Boolean))];
  const seenLinks = new Set();
  merged.links = merged.links.filter((link) => { if (!link?.url || seenLinks.has(link.url)) return false; seenLinks.add(link.url); return true; });
  return merged;
}

function normalizeRequest(body = {}) { const fields = body.fields || body; return { request_id: fields.request_id || body.request_id || crypto.randomUUID(), chemical_name: firstUseful(fields.chemical_name, fields.product_name), product_code: clean(fields.product_code), cas_number: clean(fields.cas_number), manufacturer: clean(fields.manufacturer), sds_url: clean(fields.sds_url), composition: clean(fields.composition), exposure_route: clean(fields.exposure_route), requested_by: clean(fields.requested_by), notes: clean(fields.notes), submitted_at: new Date().toISOString() }; }
function normalizeApprovedChemical(input = {}) { const chemical = input.chemical || input; const name = firstUseful(chemical.name, chemical.chemical_name, chemical.product_name); const company = firstUseful(chemical.company, chemical.manufacturer, chemical.supplier); const now = new Date().toISOString(); return { id: slugify(`${name}-${company}-${Date.now()}`), name, company, product_code: clean(chemical.product_code) || 'N/A', use: clean(chemical.use) || 'Pending classification', sds_number: clean(chemical.sds_number) || 'N/A', sds_version: clean(chemical.sds_version) || 'N/A', issue_date: clean(chemical.issue_date) || 'N/A', revision_date: clean(chemical.revision_date) || 'N/A', supersedes_date: clean(chemical.supersedes_date) || 'N/A', composition: clean(chemical.composition), hfrp_info: clean(chemical.hfrp_info) || 'N/A', sds_url: clean(chemical.sds_url), sds_reference: clean(chemical.sds_url), approved_by: clean(input.reviewer || input.approved_by), approved_at: clean(input.approved_at) || now, review_notes: clean(input.review_notes), updated_at: now.slice(0, 10) }; }
async function ensureDataFile() { await fs.mkdir(DATA_DIR, { recursive: true }); try { await fs.access(LOCAL_APPROVED_PATH); } catch { await fs.writeFile(LOCAL_APPROVED_PATH, '[]\n'); } }
async function readLocalApproved() { await ensureDataFile(); try { const parsed = JSON.parse(await fs.readFile(LOCAL_APPROVED_PATH, 'utf8')); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
async function appendLocalApproved(record) { const current = await readLocalApproved(); current.push(record); await fs.writeFile(LOCAL_APPROVED_PATH, `${JSON.stringify(current, null, 2)}\n`); }
function approvedJs(records) { return `globalThis.SDS_RECORDS = (globalThis.SDS_RECORDS || []).concat(${JSON.stringify(records, null, 2)});\n`; }
async function commitApprovedToGithub(record) { const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO, filePath = process.env.GITHUB_APPROVED_FILE || 'chemicalsearch-site/sds-approved.js', branch = process.env.GITHUB_BRANCH || 'main'; if (!token || !repo) return { skipped: true, reason: 'GITHUB_TOKEN or GITHUB_REPO not configured' }; const [owner, repoName] = repo.split('/'); const apiBase = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`; const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }); let records = [], sha; if (getRes.ok) { const existing = await getRes.json(); sha = existing.sha; const decoded = Buffer.from(existing.content || '', 'base64').toString('utf8'); const match = decoded.match(/concat\((\[[\s\S]*\])\);?\s*$/); if (match) { try { records = JSON.parse(match[1]); } catch { records = []; } } } records.push(record); const putRes = await fetch(apiBase, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Approve chemical: ${record.name}`, content: Buffer.from(approvedJs(records)).toString('base64'), sha, branch }) }); if (!putRes.ok) throw new Error(`GitHub update failed: ${putRes.status} ${await putRes.text()}`); const result = await putRes.json(); return { skipped: false, commit_sha: result.commit?.sha }; }

app.get('/health', (req, res) => res.json({ ok: true, service: 'chemicalsearch-backend' }));
app.post('/api/autofill', async (req, res) => { try { const fields = req.body.fields || req.body; const term = buildLookupTerm(fields); if (term.length < 2) return res.status(400).json({ error: 'Enter at least one product, CAS, supplier, composition, or SDS field.' }); const candidates = []; const tasks = []; if (clean(fields.sds_url)) tasks.push(lookupSubmittedSds(fields.sds_url).then((r) => r && candidates.push(r)).catch((e) => candidates.push({ confidence: 0.1, source: 'Submitted SDS document', source_type: 'sds_document_parse_error', fields: { sds_url: fields.sds_url }, notes: [`Could not read SDS link: ${e.message}`], links: [{ label: 'Submitted SDS', url: fields.sds_url }] }))); if (!/^https?:\/\//i.test(term)) tasks.push(lookupPubChem(term).then((r) => r && candidates.push(r)).catch(() => null)); if (!clean(fields.sds_url)) tasks.push(lookupSdsSearch(term, fields).then((r) => r && candidates.push(r)).catch(() => null)); await Promise.allSettled(tasks); res.json({ query: term, ...mergeCandidates(candidates), warning: 'Autofill is a review aid only. Always verify against the current official SDS before adding or using safety data.' }); } catch (error) { res.status(500).json({ error: error.message || 'Autofill failed' }); } });
app.post('/api/submit-request', async (req, res) => { try { const request = normalizeRequest(req.body); const webhookUrl = process.env.POWER_AUTOMATE_WEBHOOK_URL; if (!webhookUrl) return res.status(202).json({ ok: true, queued: false, request, message: 'Request received locally, but POWER_AUTOMATE_WEBHOOK_URL is not configured yet.' }); const flowRes = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...request, secret: process.env.POWER_AUTOMATE_SHARED_SECRET || '' }) }); if (!flowRes.ok) throw new Error(`Power Automate webhook failed: ${flowRes.status} ${await flowRes.text()}`); res.json({ ok: true, queued: true, request_id: request.request_id, message: 'Request sent to Teams for supervisor review.' }); } catch (error) { res.status(500).json({ error: error.message || 'Submit request failed' }); } });
app.post('/api/review-callback', async (req, res) => { try { const expectedSecret = process.env.REVIEW_CALLBACK_SECRET || ''; const providedSecret = req.get('x-review-secret') || req.body.secret || ''; if (expectedSecret && providedSecret !== expectedSecret) return res.status(401).json({ error: 'Unauthorized review callback.' }); const decision = clean(req.body.decision).toLowerCase(); if (!['approved','approve','denied','deny','rejected','reject'].includes(decision)) return res.status(400).json({ error: 'Decision must be approved or denied.' }); if (['denied','deny','rejected','reject'].includes(decision)) return res.json({ ok: true, decision: 'denied', request_id: req.body.request_id, message: 'Denial received. No chemical record was added.' }); const record = normalizeApprovedChemical(req.body); if (!record.name || !record.sds_url) return res.status(400).json({ error: 'Approved chemical requires at least name and SDS URL.' }); await appendLocalApproved(record); const github = await commitApprovedToGithub(record); res.json({ ok: true, decision: 'approved', record, github }); } catch (error) { res.status(500).json({ error: error.message || 'Review callback failed' }); } });
app.get('/api/approved-chemicals', async (req, res) => { try { res.json(await readLocalApproved()); } catch (error) { res.status(500).json({ error: error.message || 'Could not read approved chemicals' }); } });
app.listen(PORT, () => console.log(`ChemicalSearch backend running at http://localhost:${PORT}`));
