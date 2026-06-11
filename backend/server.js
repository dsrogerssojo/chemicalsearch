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

function productIdentities(record = {}) {
  const name = useful(record.name || record.chemical_name || record.product_name).toLowerCase();
  const company = useful(record.company || record.manufacturer || record.supplier).toLowerCase();
  const productCode = useful(record.product_code).toLowerCase();
  const originalName = useful(record.original_chemical_name || record.original_name).toLowerCase();
  const originalCompany = useful(record.original_company || record.original_manufacturer).toLowerCase();
  const originalProductCode = useful(record.original_product_code).toLowerCase();
  const sdsCandidate = useful(record.sds_url || record.sds_reference).toLowerCase();
  const sdsUrl = /^https?:\/\//.test(sdsCandidate) ? sdsCandidate : '';
  const identities = [];

  if (name && productCode) identities.push(`name-code:${name}|${productCode}`);
  if (name && company) identities.push(`name-company:${name}|${company}`);
  if (originalName && originalProductCode) identities.push(`name-code:${originalName}|${originalProductCode}`);
  if (originalName && originalCompany) identities.push(`name-company:${originalName}|${originalCompany}`);
  if (sdsUrl) identities.push(`sds:${sdsUrl}`);
  if (!identities.length && name) identities.push(`name:${name}`);
  if (!identities.length && originalName) identities.push(`name:${originalName}`);

  return identities;
}

function productIdentity(record = {}) {
  return productIdentities(record)[0] || '';
}

function sameProduct(a = {}, b = {}) {
  const aId = clean(a.id);
  const bId = clean(b.id);
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
    original_record_id: clean(fields.original_record_id),
    original_chemical_name: firstUseful(fields.original_chemical_name, fields.original_name),
    original_company: firstUseful(fields.original_company, fields.original_manufacturer),
    original_product_code: clean(fields.original_product_code),
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
  const recordId = firstUseful(
    chemical.record_id,
    input.record_id,
    chemical.original_record_id,
    input.original_record_id,
    chemical.existing_record_id,
    input.existing_record_id,
    chemical.id
  );
  const productCode = clean(chemical.product_code);
  const now = new Date().toISOString();

  return {
    id: recordId || slugify(`${name}-${company}-${productCode}`),
    name,
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
    original_record_id: clean(chemical.original_record_id || input.original_record_id),
    original_chemical_name: clean(chemical.original_chemical_name || input.original_chemical_name),
    original_company: clean(chemical.original_company || input.original_company),
    original_product_code: clean(chemical.original_product_code || input.original_product_code),
    approved_by: clean(input.reviewer || input.approved_by),
    approved_at: clean(input.approved_at) || now,
    review_notes: clean(input.review_notes),
    updated_at: now.slice(0, 10)
  };
}

function normalizeDeletedChemical(input = {}) {
  const chemical = input.chemical || input;
  const now = new Date().toISOString();
  const id = firstUseful(
    chemical.record_id,
    input.record_id,
    chemical.original_record_id,
    input.original_record_id,
    chemical.existing_record_id,
    input.existing_record_id,
    chemical.id
  );
  const name = firstUseful(chemical.name, chemical.chemical_name, chemical.product_name);
  const company = firstUseful(chemical.company, chemical.manufacturer, chemical.supplier);
  const productCode = clean(chemical.product_code);

  return {
    id,
    name,
    company,
    product_code: productCode,
    cas_number: clean(chemical.cas_number),
    sds_url: clean(chemical.sds_url),
    sds_reference: clean(chemical.sds_url),
    original_record_id: clean(chemical.original_record_id || input.original_record_id),
    original_chemical_name: clean(chemical.original_chemical_name || input.original_chemical_name),
    original_company: clean(chemical.original_company || input.original_company),
    original_product_code: clean(chemical.original_product_code || input.original_product_code),
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
    original_record_id: request.original_record_id || request.record_id,
    original_chemical_name: request.original_chemical_name,
    original_company: request.original_company,
    original_product_code: request.original_product_code,
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
          { title: 'Requested by', value: reviewRecord.requested_by || 'Not listed' },
          { title: 'Submitted', value: reviewRecord.submitted_at || 'Not listed' }
        ]
      },
      reviewInput('record_id', 'Product record ID - keep for edits/deletes', reviewRecord.record_id || reviewRecord.original_record_id),
      reviewInput('original_record_id', 'Original product ID - do not change', reviewRecord.original_record_id || reviewRecord.record_id),
      reviewInput('original_chemical_name', 'Original product name - do not change', reviewRecord.original_chemical_name),
      reviewInput('original_company', 'Original company - do not change', reviewRecord.original_company),
      reviewInput('original_product_code', 'Original product code - do not change', reviewRecord.original_product_code),
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
        data: {
          decision: 'approved',
          request_id: reviewRecord.request_id,
          record_id: reviewRecord.record_id,
          original_record_id: reviewRecord.original_record_id || reviewRecord.record_id
        }
      },
      {
        type: 'Action.Submit',
        id: 'denied',
        title: 'Deny',
        data: {
          decision: 'denied',
          request_id: reviewRecord.request_id,
          record_id: reviewRecord.record_id,
          original_record_id: reviewRecord.original_record_id || reviewRecord.record_id
        }
      },
      {
        type: 'Action.Submit',
        id: 'delete',
        title: 'Delete Product',
        style: 'destructive',
        data: {
          decision: 'delete',
          request_id: reviewRecord.request_id,
          record_id: reviewRecord.record_id,
          original_record_id: reviewRecord.original_record_id || reviewRecord.record_id
        }
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
    review_fields: adaptiveCard.body.filter((item) => item.type === 'Input.Text'),
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
    const reviewInput = normalizeReviewInput(req.body);
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
