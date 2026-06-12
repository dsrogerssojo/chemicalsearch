import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ALLOWED_ORIGINS,
  DATA_DIR,
  DEFAULT_APPROVED_FILE,
  DEFAULT_GITHUB_BRANCH,
  LOCAL_APPROVED_FILENAME,
  PORT,
  REQUEST_BODY_LIMIT
} from './config.js';

const app = express();
const LOCAL_APPROVED_PATH = path.join(path.resolve(DATA_DIR), LOCAL_APPROVED_FILENAME);
const LOCAL_PENDING_PATH = path.join(path.resolve(DATA_DIR), 'pending-requests.json');
const LOCATION_OPTIONS = ['Langhorne - PA', 'Whiteland - IN', 'Temple - TX', 'Redlands - CA'];
const DEFAULT_LOCATION = LOCATION_OPTIONS[0];
const LOCATION_ALIASES = new Map([
  ['#1', 'Langhorne - PA'],
  ['1', 'Langhorne - PA'],
  ['langhorne', 'Langhorne - PA'],
  ['langhorne - pa', 'Langhorne - PA'],
  ['langhorne-pa', 'Langhorne - PA'],
  ['#2', 'Whiteland - IN'],
  ['2', 'Whiteland - IN'],
  ['whiteland', 'Whiteland - IN'],
  ['whiteland - in', 'Whiteland - IN'],
  ['whiteland-in', 'Whiteland - IN'],
  ['#3', 'Temple - TX'],
  ['3', 'Temple - TX'],
  ['temple', 'Temple - TX'],
  ['temple - tx', 'Temple - TX'],
  ['temple-tx', 'Temple - TX'],
  ['#4', 'Redlands - CA'],
  ['4', 'Redlands - CA'],
  ['redlands', 'Redlands - CA'],
  ['redlands - ca', 'Redlands - CA'],
  ['redlands-ca', 'Redlands - CA']
]);
const LOCATION_KEYS = new Map(LOCATION_OPTIONS.map((location) => [
  location.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  location
]));
const pendingRequests = new Map();

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin not allowed: ${origin}`));
  }
}));

app.use(express.json({ limit: REQUEST_BODY_LIMIT }));

function clean(value) {
  const text = String(value || '').trim();
  if (/^\$\{[^}]+\}$/.test(text) || /^@\{[^}]+\}$/.test(text)) return '';
  return text;
}

function firstUseful(...values) {
  return values.map(clean).find(Boolean) || '';
}

function cleanLocation(value) {
  const location = clean(value);
  if (LOCATION_OPTIONS.includes(location)) return location;
  const key = location.toLowerCase();
  return LOCATION_ALIASES.get(key) || LOCATION_KEYS.get(key) || '';
}

function locationFromRequestId(value) {
  const requestId = clean(value).toLowerCase();
  if (!requestId) return '';

  for (const [key, location] of LOCATION_KEYS) {
    if (requestId.startsWith(`${key}--`)) return location;
  }

  return '';
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `chemical-${Date.now()}`;
}

function useful(value) {
  const text = clean(value);
  return text && text.toLowerCase() !== 'n/a' ? text : '';
}

function comparable(value) {
  return useful(value).toLowerCase();
}

function productIdentities(record = {}) {
  const name = useful(record.name || record.chemical_name || record.product_name).toLowerCase();
  const company = useful(record.company || record.manufacturer || record.supplier).toLowerCase();
  const productCode = useful(record.product_code).toLowerCase();
  const location = (cleanLocation(record.location || record.site_location || record.facility_location) || DEFAULT_LOCATION).toLowerCase();
  const sdsCandidate = useful(record.sds_url || record.sds_reference).toLowerCase();
  const sdsUrl = /^https?:\/\//.test(sdsCandidate) ? sdsCandidate : '';
  const identities = [];

  if (name && productCode) identities.push(`name-code:${location}|${name}|${productCode}`);
  if (name && company) identities.push(`name-company:${location}|${name}|${company}`);
  if (sdsUrl) identities.push(`sds:${location}|${sdsUrl}`);
  if (!identities.length && name) identities.push(`name:${location}|${name}`);

  return identities;
}

function productIdentity(record = {}) {
  return productIdentities(record)[0] || '';
}

function sameProduct(a = {}, b = {}) {
  const aId = clean(a.id);
  const bId = clean(b.id);
  const aLocation = cleanLocation(a.location || a.site_location || a.facility_location) || DEFAULT_LOCATION;
  const bLocation = cleanLocation(b.location || b.site_location || b.facility_location) || DEFAULT_LOCATION;
  if (aLocation !== bLocation) return false;
  if (aId && bId && aId === bId) return true;

  const bProducts = new Set(productIdentities(b));
  return productIdentities(a).some((identity) => bProducts.has(identity));
}

const PRODUCT_REVIEW_FIELDS = [
  'chemical_name',
  'name',
  'product_name',
  'company',
  'manufacturer',
  'supplier',
  'product_code',
  'cas_number',
  'use',
  'sds_number',
  'sds_version',
  'issue_date',
  'revision_date',
  'supersedes_date',
  'hfrp_info',
  'sds_url',
  'composition'
];

function hasBlankProductFields(input = {}) {
  const chemical = input.chemical || input;
  return PRODUCT_REVIEW_FIELDS.every((field) => !clean(chemical[field]));
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function hasKeys(value) {
  return Object.keys(value).length > 0;
}

function normalizeReviewInput(input = {}) {
  const body = objectValue(input.body);
  const inputData = objectValue(input.data);
  const bodyData = objectValue(body.data);
  const data = hasKeys(inputData) ? inputData : bodyData;
  const inputFields = objectValue(input.fields);
  const bodyFields = objectValue(body.fields);
  const dataFields = objectValue(data.fields);
  const fields = hasKeys(inputFields) ? inputFields : hasKeys(bodyFields) ? bodyFields : dataFields;
  const inputChemical = objectValue(input.chemical);
  const bodyChemical = objectValue(body.chemical);
  const dataChemical = objectValue(data.chemical);
  const fieldChemical = objectValue(fields.chemical);
  const chemical = hasKeys(inputChemical) ? inputChemical : hasKeys(bodyChemical) ? bodyChemical : hasKeys(dataChemical) ? dataChemical : fieldChemical;
  const responder = objectValue(input.responder || body.responder);
  const merged = {
    ...input,
    ...body,
    ...data,
    ...fields,
    ...chemical
  };

  return {
    ...merged,
    chemical: {
      ...merged,
      ...chemical
    },
    approved_by: firstUseful(input.approved_by, body.approved_by, data.approved_by, fields.approved_by, responder.email),
    reviewer: firstUseful(input.reviewer, body.reviewer, data.reviewer, fields.reviewer, responder.email)
  };
}

function normalizeRequest(body = {}) {
  const fields = body.fields || body;

  return {
    request_id: fields.request_id || body.request_id || crypto.randomUUID(),
    record_id: clean(fields.record_id),
    location: locationFromRequestId(fields.request_id || body.request_id) || cleanLocation(fields.location || fields.selected_location || fields.submitted_location || fields.original_location || fields.site_location || fields.facility_location) || DEFAULT_LOCATION,
    chemical_name: firstUseful(fields.chemical_name, fields.product_name, fields.name),
    product_code: clean(fields.product_code),
    cas_number: clean(fields.cas_number),
    manufacturer: firstUseful(fields.manufacturer, fields.company, fields.supplier),
    sds_url: clean(fields.sds_url),
    use: clean(fields.use),
    sds_number: clean(fields.sds_number),
    sds_version: clean(fields.sds_version),
    issue_date: clean(fields.issue_date),
    revision_date: clean(fields.revision_date),
    supersedes_date: clean(fields.supersedes_date),
    composition: clean(fields.composition),
    hfrp_info: clean(fields.hfrp_info),
    requested_by: clean(fields.requested_by),
    notes: clean(fields.notes),
    submitted_at: new Date().toISOString()
  };
}

function normalizeApprovedChemical(input = {}) {
  const chemical = input.chemical || input;
  const name = firstUseful(chemical.name, chemical.chemical_name, chemical.product_name);
  const company = firstUseful(chemical.company, chemical.manufacturer, chemical.supplier);
  const recordId = firstUseful(chemical.record_id, input.record_id, chemical.id);
  const productCode = clean(chemical.product_code);
  const location = cleanLocation(
    locationFromRequestId(input.request_id || chemical.request_id) ||
    input.original_location ||
    input.submitted_location ||
    input.location ||
    input.selected_location ||
    input.site_location ||
    input.facility_location ||
    chemical.original_location ||
    chemical.submitted_location ||
    chemical.location ||
    chemical.selected_location ||
    chemical.site_location ||
    chemical.facility_location
  ) || DEFAULT_LOCATION;
  const now = new Date().toISOString();

  return {
    id: recordId || slugify(`${name}-${company}-${productCode}-${location}`),
    name,
    location,
    company,
    product_code: productCode || 'N/A',
    cas_number: clean(chemical.cas_number),
    use: clean(chemical.use) || 'Pending classification',
    sds_number: clean(chemical.sds_number) || 'N/A',
    sds_version: clean(chemical.sds_version) || 'N/A',
    issue_date: clean(chemical.issue_date) || 'N/A',
    revision_date: clean(chemical.revision_date) || 'N/A',
    supersedes_date: clean(chemical.supersedes_date) || 'N/A',
    composition: clean(chemical.composition),
    hfrp_info: clean(chemical.hfrp_info) || 'N/A',
    sds_url: clean(chemical.sds_url),
    sds_reference: clean(chemical.sds_url),
    request_id: clean(input.request_id),
    approved_by: clean(input.reviewer || input.approved_by),
    approved_at: clean(input.approved_at) || now,
    review_notes: clean(input.review_notes),
    updated_at: now.slice(0, 10)
  };
}

function normalizeDeletedChemical(input = {}) {
  const chemical = input.chemical || input;
  const now = new Date().toISOString();
  const id = firstUseful(chemical.record_id, input.record_id, chemical.id);
  const name = firstUseful(chemical.name, chemical.chemical_name, chemical.product_name);
  const company = firstUseful(chemical.company, chemical.manufacturer, chemical.supplier);
  const productCode = clean(chemical.product_code);
  const location = cleanLocation(
    locationFromRequestId(input.request_id || chemical.request_id) ||
    input.original_location ||
    input.submitted_location ||
    input.location ||
    input.selected_location ||
    input.site_location ||
    input.facility_location ||
    chemical.original_location ||
    chemical.submitted_location ||
    chemical.location ||
    chemical.selected_location ||
    chemical.site_location ||
    chemical.facility_location
  );

  return {
    id,
    name,
    location,
    company,
    product_code: productCode,
    cas_number: clean(chemical.cas_number),
    sds_url: clean(chemical.sds_url),
    sds_reference: clean(chemical.sds_url),
    deleted: true,
    status: 'deleted',
    deleted_at: now,
    approved_by: clean(input.reviewer || input.approved_by),
    review_notes: clean(input.review_notes),
    request_id: clean(input.request_id),
    updated_at: now.slice(0, 10)
  };
}

function buildReviewRecord(request) {
  return {
    request_id: request.request_id,
    record_id: request.record_id,
    location: request.location || DEFAULT_LOCATION,
    selected_location: request.location || DEFAULT_LOCATION,
    submitted_location: request.location || DEFAULT_LOCATION,
    original_location: request.location || DEFAULT_LOCATION,
    site_location: request.location || DEFAULT_LOCATION,
    facility_location: request.location || DEFAULT_LOCATION,
    chemical_name: request.chemical_name,
    name: request.chemical_name,
    company: request.manufacturer,
    manufacturer: request.manufacturer,
    product_code: request.product_code,
    cas_number: request.cas_number,
    use: request.use,
    sds_number: request.sds_number,
    sds_version: request.sds_version,
    issue_date: request.issue_date,
    revision_date: request.revision_date,
    supersedes_date: request.supersedes_date,
    hfrp_info: request.hfrp_info,
    sds_url: request.sds_url,
    composition: request.composition,
    approved_by: '',
    review_notes: request.notes,
    requested_by: request.requested_by,
    requester_notes: request.notes,
    submitted_at: request.submitted_at
  };
}

function reviewInput(id, label, value = '', options = {}) {
  return {
    type: 'Input.Text',
    id,
    label,
    value: clean(value),
    isMultiline: Boolean(options.isMultiline)
  };
}

async function hydrateReviewInput(input = {}) {
  const pending = await findPendingRequest(input);

  if (!pending) return input;
  const location = cleanLocation(pending.location) || DEFAULT_LOCATION;
  const requestId = clean(pending.request_id) || clean(input.request_id);

  return {
    ...pending,
    ...input,
    request_id: requestId,
    location,
    selected_location: location,
    submitted_location: location,
    original_location: location,
    site_location: location,
    facility_location: location,
    chemical: {
      ...pending,
      ...input.chemical,
      ...input,
      request_id: requestId,
      location,
      selected_location: location,
      submitted_location: location,
      original_location: location,
      site_location: location,
      facility_location: location
    }
  };
}

function reviewActionData(decision, reviewRecord) {
  const submittedLocation = cleanLocation(reviewRecord.location) || DEFAULT_LOCATION;

  return {
    decision,
    request_id: reviewRecord.request_id,
    record_id: reviewRecord.record_id,
    location: submittedLocation,
    selected_location: submittedLocation,
    submitted_location: submittedLocation,
    original_location: submittedLocation,
    site_location: submittedLocation,
    facility_location: submittedLocation
  };
}

function buildReviewAdaptiveCard(reviewRecord) {
  return {
    type: 'AdaptiveCard',
    version: '1.2',
    body: [
      {
        type: 'TextBlock',
        text: 'ChemicalSearch Review Request',
        weight: 'Bolder',
        size: 'Large',
        wrap: true
      },
      {
        type: 'TextBlock',
        text: 'Edit any fields before approving. Product name is required for adding or updating; SDS link is optional. Use Delete Product to remove an existing product card.',
        wrap: true
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Request ID', value: reviewRecord.request_id || '' },
          { title: 'Product record ID', value: reviewRecord.record_id || 'New product' },
          { title: 'Location', value: reviewRecord.location || DEFAULT_LOCATION },
          { title: 'Requested by', value: reviewRecord.requested_by || 'Not listed' },
          { title: 'Submitted', value: reviewRecord.submitted_at || 'Not listed' }
        ]
      },
      reviewInput('chemical_name', 'Chemical/product name', reviewRecord.chemical_name),
      reviewInput('company', 'Company/manufacturer', reviewRecord.company),
      reviewInput('product_code', 'Product code', reviewRecord.product_code),
      reviewInput('cas_number', 'CAS number', reviewRecord.cas_number),
      reviewInput('use', 'Use / classification', reviewRecord.use),
      reviewInput('sds_number', 'SDS number', reviewRecord.sds_number),
      reviewInput('sds_version', 'SDS version', reviewRecord.sds_version),
      reviewInput('issue_date', 'Issue date', reviewRecord.issue_date),
      reviewInput('revision_date', 'Revision date', reviewRecord.revision_date),
      reviewInput('supersedes_date', 'Supersedes date', reviewRecord.supersedes_date),
      reviewInput('hfrp_info', 'HFRP / NFPA info', reviewRecord.hfrp_info),
      reviewInput('sds_url', 'SDS link', reviewRecord.sds_url),
      reviewInput('composition', 'Composition / active ingredient', reviewRecord.composition, { isMultiline: true }),
      reviewInput('approved_by', 'Approved by', reviewRecord.approved_by),
      reviewInput('review_notes', 'Reviewer notes', reviewRecord.review_notes, { isMultiline: true }),
      reviewInput('requester_notes', 'Requester notes', reviewRecord.requester_notes, { isMultiline: true })
    ],
    actions: [
      {
        type: 'Action.Submit',
        id: 'approved',
        title: 'Approve Changes',
        data: reviewActionData('approved', reviewRecord)
      },
      {
        type: 'Action.Submit',
        id: 'denied',
        title: 'Deny',
        data: reviewActionData('denied', reviewRecord)
      },
      {
        type: 'Action.Submit',
        id: 'delete',
        title: 'Delete Product',
        style: 'destructive',
        data: reviewActionData('delete', reviewRecord)
      }
    ]
  };
}

function buildPowerAutomateReviewPayload(request) {
  const reviewRecord = buildReviewRecord(request);
  const adaptiveCard = buildReviewAdaptiveCard(reviewRecord);

  return {
    ...request,
    ...reviewRecord,
    secret: process.env.POWER_AUTOMATE_SHARED_SECRET || '',
    review_fields: adaptiveCard.body.filter((item) => item.type === 'Input.Text' || item.type === 'Input.ChoiceSet'),
    adaptive_card: adaptiveCard,
    card_version: adaptiveCard.version,
    instructions: 'Reviewer should edit fields in Teams before approving. Forward all submitted input fields to /api/review-callback.'
  };
}

async function ensureDataFile() {
  await fs.mkdir(path.resolve(DATA_DIR), { recursive: true });

  try {
    await fs.access(LOCAL_APPROVED_PATH);
  } catch {
    await fs.writeFile(LOCAL_APPROVED_PATH, '[]\n');
  }
}

async function readLocalApproved() {
  await ensureDataFile();

  try {
    const parsed = JSON.parse(await fs.readFile(LOCAL_APPROVED_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readPendingRequests() {
  await fs.mkdir(path.resolve(DATA_DIR), { recursive: true });

  try {
    const parsed = JSON.parse(await fs.readFile(LOCAL_PENDING_PATH, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writePendingRequests(requests) {
  await fs.mkdir(path.resolve(DATA_DIR), { recursive: true });
  await fs.writeFile(LOCAL_PENDING_PATH, `${JSON.stringify(requests, null, 2)}\n`);
}

async function rememberPendingRequest(request) {
  const requestId = clean(request.request_id);
  if (!requestId) return;

  pendingRequests.set(requestId, request);
  const requests = await readPendingRequests();
  requests[requestId] = request;
  await writePendingRequests(requests);
}

async function getPendingRequest(requestId) {
  const key = clean(requestId);
  if (!key) return null;

  const cached = pendingRequests.get(key);
  if (cached) return cached;

  const requests = await readPendingRequests();
  const request = requests[key] || null;
  if (request) pendingRequests.set(key, request);
  return request;
}

function pendingRequestMatchScore(request = {}, input = {}) {
  const chemical = input.chemical || input;
  const requestRecordId = comparable(request.record_id);
  const inputRecordId = comparable(firstUseful(input.record_id, chemical.record_id, input.id, chemical.id));
  const requestName = comparable(request.chemical_name);
  const inputName = comparable(firstUseful(chemical.chemical_name, chemical.name, chemical.product_name));
  const requestCode = comparable(request.product_code);
  const inputCode = comparable(chemical.product_code);
  const requestCompany = comparable(request.manufacturer);
  const inputCompany = comparable(firstUseful(chemical.company, chemical.manufacturer, chemical.supplier));

  if (inputRecordId && requestRecordId === inputRecordId) return 100;
  if (!inputName || requestName !== inputName) return 0;

  let score = 50;
  if (inputCode && requestCode === inputCode) score += 20;
  if (inputCompany && requestCompany === inputCompany) score += 10;
  return score;
}

async function findPendingRequest(input = {}) {
  const requestId = clean(input.request_id);
  if (requestId) {
    const exact = await getPendingRequest(requestId);
    if (exact) return exact;
  }

  const requests = Object.values(await readPendingRequests());
  return requests
    .map((request) => ({ request, score: pendingRequestMatchScore(request, input) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return String(b.request.submitted_at || '').localeCompare(String(a.request.submitted_at || ''));
    })[0]?.request || null;
}

async function forgetPendingRequest(requestId) {
  const key = clean(requestId);
  if (!key) return;

  pendingRequests.delete(key);
  const requests = await readPendingRequests();
  if (requests[key]) {
    delete requests[key];
    await writePendingRequests(requests);
  }
}

function upsertRecord(records, record) {
  records = records.filter((item) => !sameProduct(item, record));
  records.push(record);
  return records;
}

async function upsertLocalApproved(record) {
  const current = await readLocalApproved();
  const records = upsertRecord(current, record);
  await fs.writeFile(LOCAL_APPROVED_PATH, `${JSON.stringify(records, null, 2)}\n`);
}

function approvedJs(records) {
  return `globalThis.SDS_RECORDS = (globalThis.SDS_RECORDS || []).concat(${JSON.stringify(records, null, 2)});\n`;
}

async function commitApprovedToGithub(record, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const filePath = process.env.GITHUB_APPROVED_FILE || DEFAULT_APPROVED_FILE;
  const branch = process.env.GITHUB_BRANCH || DEFAULT_GITHUB_BRANCH;

  if (!token || !repo) {
    return { skipped: true, reason: 'GITHUB_TOKEN or GITHUB_REPO not configured' };
  }

  const [owner, repoName] = repo.split('/');
  const apiBase = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`;
  const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  let records = [];
  let sha;

  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;

    const decoded = Buffer.from(existing.content || '', 'base64').toString('utf8');
    const match = decoded.match(/concat\((\[[\s\S]*\])\);?\s*$/);

    if (match) {
      try {
        records = JSON.parse(match[1]);
      } catch {
        records = [];
      }
    }
  }

  records = upsertRecord(records, record);

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: options.delete ? `Delete chemical record: ${record.id || record.name || 'unknown chemical'}` : `Approve chemical: ${record.name}`,
      content: Buffer.from(approvedJs(records)).toString('base64'),
      sha,
      branch
    })
  });

  if (!putRes.ok) {
    throw new Error(`GitHub update failed: ${putRes.status} ${await putRes.text()}`);
  }

  const result = await putRes.json();
  return { skipped: false, commit_sha: result.commit?.sha };
}

async function triggerFrontendDeploy(githubResult) {
  const hookUrl = clean(process.env.FRONTEND_DEPLOY_HOOK_URL);

  if (!hookUrl) {
    return { skipped: true, reason: 'FRONTEND_DEPLOY_HOOK_URL not configured' };
  }

  if (githubResult?.skipped) {
    return { skipped: true, reason: 'GitHub writeback was skipped, so frontend deploy was not triggered' };
  }

  try {
    const res = await fetch(hookUrl, { method: 'POST' });

    if (!res.ok) {
      return {
        skipped: false,
        ok: false,
        status: res.status,
        error: await res.text()
      };
    }

    return { skipped: false, ok: true, status: res.status };
  } catch (error) {
    return {
      skipped: false,
      ok: false,
      error: error.message || 'Frontend deploy hook failed'
    };
  }
}

function isDeniedDecision(decision) {
  return ['denied', 'deny', 'rejected', 'reject'].includes(decision);
}

function isDeleteDecision(decision) {
  return ['delete', 'deleted', 'remove', 'removed'].includes(decision);
}

function isKnownDecision(decision) {
  return ['approved', 'approve', 'denied', 'deny', 'rejected', 'reject', 'delete', 'deleted', 'remove', 'removed'].includes(decision);
}

function normalizeDecision(input = {}) {
  const rawDecision = firstUseful(input.decision, input.submitActionId, input.action, input.title).toLowerCase();
  const compact = rawDecision.replace(/[^a-z]/g, '');

  if (['approve', 'approved', 'approvechanges', 'submitapprove'].includes(compact)) return 'approved';
  if (['deny', 'denied', 'reject', 'rejected'].includes(compact)) return 'denied';
  if (['delete', 'deleted', 'remove', 'removed', 'deleteproduct'].includes(compact)) return 'delete';
  if (!rawDecision && !hasBlankProductFields(input)) return 'approved';

  return rawDecision;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'chemicalsearch-backend' });
});

app.post('/api/submit-request', async (req, res) => {
  try {
    const request = normalizeRequest(req.body);
    const webhookUrl = process.env.POWER_AUTOMATE_WEBHOOK_URL;
    await rememberPendingRequest(request);

    if (!webhookUrl) {
      return res.status(202).json({
        ok: true,
        queued: false,
        request,
        message: 'Request received locally, but POWER_AUTOMATE_WEBHOOK_URL is not configured yet.'
      });
    }

    const flowRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPowerAutomateReviewPayload(request))
    });

    if (!flowRes.ok) {
      throw new Error(`Power Automate webhook failed: ${flowRes.status} ${await flowRes.text()}`);
    }

    res.json({
      ok: true,
      queued: true,
      request_id: request.request_id,
      message: 'Request sent to Teams for supervisor review.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Submit request failed' });
  }
});

app.post('/api/review-callback', async (req, res) => {
  try {
    const reviewInput = await hydrateReviewInput(normalizeReviewInput(req.body));
    const expectedSecret = process.env.REVIEW_CALLBACK_SECRET || '';
    const providedSecret = req.get('x-review-secret') || reviewInput.secret || '';

    if (expectedSecret && providedSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized review callback.' });
    }

    const decision = normalizeDecision(reviewInput);

    if (!isKnownDecision(decision)) {
      return res.status(400).json({ error: 'Decision must be approved, denied, or delete.' });
    }

    if (isDeniedDecision(decision)) {
      await forgetPendingRequest(reviewInput.request_id);
      return res.json({
        ok: true,
        decision: 'denied',
        request_id: reviewInput.request_id,
        message: 'Denial received. No chemical record was added.'
      });
    }

    const deleteRecordId = firstUseful(reviewInput.record_id, reviewInput.chemical?.record_id, reviewInput.id, reviewInput.chemical?.id);

    if (isDeleteDecision(decision) || (deleteRecordId && hasBlankProductFields(reviewInput))) {
      const record = normalizeDeletedChemical(reviewInput);

      if (!record.id && !productIdentity(record)) {
        return res.status(400).json({ error: 'Delete requires record_id or product details so the product can be removed.' });
      }

      await upsertLocalApproved(record);
      const github = await commitApprovedToGithub(record, { delete: true });
      const frontend_deploy = await triggerFrontendDeploy(github);
      await forgetPendingRequest(reviewInput.request_id);

      return res.json({
        ok: true,
        decision: 'deleted',
        record_id: record.id || '',
        record,
        github,
        frontend_deploy
      });
    }

    const record = normalizeApprovedChemical(reviewInput);

    if (!record.name) {
      return res.status(400).json({ error: 'Approved chemical requires at least a product name.' });
    }

    await upsertLocalApproved(record);
    const github = await commitApprovedToGithub(record);
    const frontend_deploy = await triggerFrontendDeploy(github);
    await forgetPendingRequest(reviewInput.request_id);

    res.json({
      ok: true,
      decision: 'approved',
      record,
      github,
      frontend_deploy
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Review callback failed' });
  }
});

app.get('/api/approved-chemicals', async (req, res) => {
  try {
    res.json(await readLocalApproved());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Could not read approved chemicals' });
  }
});

app.listen(PORT, () => {
  console.log(`ChemicalSearch backend running at http://localhost:${PORT}`);
});
