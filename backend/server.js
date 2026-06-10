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
  return String(value || '').trim();
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

function normalizeRequest(body = {}) {
  const fields = body.fields || body;

  return {
    request_id: fields.request_id || body.request_id || crypto.randomUUID(),
    chemical_name: firstUseful(fields.chemical_name, fields.product_name, fields.name),
    product_code: clean(fields.product_code),
    cas_number: clean(fields.cas_number),
    manufacturer: firstUseful(fields.manufacturer, fields.company, fields.supplier),
    sds_url: clean(fields.sds_url),
    requested_by: clean(fields.requested_by),
    notes: clean(fields.notes),
    submitted_at: new Date().toISOString()
  };
}

function normalizeApprovedChemical(input = {}) {
  const chemical = input.chemical || input;
  const name = firstUseful(chemical.name, chemical.chemical_name, chemical.product_name);
  const company = firstUseful(chemical.company, chemical.manufacturer, chemical.supplier);
  const now = new Date().toISOString();

  return {
    id: slugify(`${name}-${company}-${Date.now()}`),
    name,
    company,
    product_code: clean(chemical.product_code) || 'N/A',
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
    approved_by: clean(input.reviewer || input.approved_by),
    approved_at: clean(input.approved_at) || now,
    review_notes: clean(input.review_notes),
    updated_at: now.slice(0, 10)
  };
}

function buildReviewRecord(request) {
  return {
    request_id: request.request_id,
    chemical_name: request.chemical_name,
    name: request.chemical_name,
    company: request.manufacturer,
    manufacturer: request.manufacturer,
    product_code: request.product_code,
    cas_number: request.cas_number,
    use: '',
    sds_number: '',
    sds_version: '',
    issue_date: '',
    revision_date: '',
    supersedes_date: '',
    hfrp_info: '',
    sds_url: request.sds_url,
    composition: '',
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
        text: 'Edit any fields before approving. Blank fields can stay blank, but name and SDS link are required for approval.',
        wrap: true
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Request ID', value: reviewRecord.request_id || '' },
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
        title: 'Approve and Add Chemical',
        data: {
          decision: 'approved',
          request_id: reviewRecord.request_id
        }
      },
      {
        type: 'Action.Submit',
        title: 'Deny',
        data: {
          decision: 'denied',
          request_id: reviewRecord.request_id
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

async function appendLocalApproved(record) {
  const current = await readLocalApproved();
  current.push(record);
  await fs.writeFile(LOCAL_APPROVED_PATH, `${JSON.stringify(current, null, 2)}\n`);
}

function approvedJs(records) {
  return `globalThis.SDS_RECORDS = (globalThis.SDS_RECORDS || []).concat(${JSON.stringify(records, null, 2)});\n`;
}

async function commitApprovedToGithub(record) {
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

  records.push(record);

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Approve chemical: ${record.name}`,
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

function isKnownDecision(decision) {
  return ['approved', 'approve', 'denied', 'deny', 'rejected', 'reject'].includes(decision);
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
    const expectedSecret = process.env.REVIEW_CALLBACK_SECRET || '';
    const providedSecret = req.get('x-review-secret') || req.body.secret || '';

    if (expectedSecret && providedSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized review callback.' });
    }

    const decision = clean(req.body.decision).toLowerCase();

    if (!isKnownDecision(decision)) {
      return res.status(400).json({ error: 'Decision must be approved or denied.' });
    }

    if (isDeniedDecision(decision)) {
      return res.json({
        ok: true,
        decision: 'denied',
        request_id: req.body.request_id,
        message: 'Denial received. No chemical record was added.'
      });
    }

    const record = normalizeApprovedChemical(req.body);

    if (!record.name || !record.sds_url) {
      return res.status(400).json({ error: 'Approved chemical requires at least name and SDS URL.' });
    }

    await appendLocalApproved(record);
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
