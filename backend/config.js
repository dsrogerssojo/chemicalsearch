export const PORT = Number(process.env.PORT || 3001);

export const DATA_DIR = 'data';
export const LOCAL_APPROVED_FILENAME = 'approved-chemicals.json';

export const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const DEFAULT_APPROVED_FILE = 'chemicalsearch-site/sds-approved.js';
export const DEFAULT_GITHUB_BRANCH = 'main';
export const REQUEST_BODY_LIMIT = '2mb';
