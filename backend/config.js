export const PORT = Number(process.env.PORT || 3001);

export const DATA_DIR = 'data';
export const LOCAL_APPROVED_FILENAME = 'approved-chemicals.json';

export const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const TRUSTED_SDS_DOMAINS = [
  'chemicalsafety.com',
  'cloroxpro.com',
  'thecloroxcompany.com',
  'diversey.com',
  'ecolab.com',
  'grainger.com',
  'sds.chemtel.net',
  'fisher.com',
  'fishersci.com',
  'sigmaaldrich.com',
  'uline.com',
  'img.uline.com',
  'simplegreen.com',
  'cdn.simplegreen.com',
  'rbnainfo.com',
  'crcindustries.com',
  'markem-imaje.com',
  'wd40.com',
  'homedepot-static.com',
  'images.thdstatic.com'
];

export const DEFAULT_APPROVED_FILE = 'chemicalsearch-site/sds-approved.js';
export const DEFAULT_GITHUB_BRANCH = 'main';
export const REQUEST_BODY_LIMIT = '2mb';
