import pdfParse from 'pdf-parse';

const CAS_PATTERN = /\b\d{2,7}-\d{2}-\d\b/g;
const URL_NAME_KEYS = ['name','product','productname','product_name','product-name','material','materialname','material_name','tradename','trade_name','title','chemical','chemicalname','chemical_name','description','filename','file_name','file'];
const JUNK_NAMES = /^(sdsviewer|viewer|view|download|index|file|document|doc|sds|msds)$/i;

export function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/tr>|<\/li>|<\/table>|<\/h\d>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function lines(text) {
  return stripHtml(text)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .split(/\n+/)
    .map(clean)
    .filter(Boolean);
}

function badValue(value) {
  const text = clean(value);
  return !text || /^(not available|n\/?a|none|unknown|section|safety data sheet|page \d+)$/i.test(text);
}

function lineAfterLabel(allLines, labels) {
  for (let i = 0; i < allLines.length; i += 1) {
    const line = allLines[i];
    for (const label of labels) {
      const safe = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = line.match(new RegExp(`^\\s*${safe}\\s*[:#\\-–—]?\\s*(.*)$`, 'i'));
      if (!match) continue;
      const inline = clean(match[1]);
      if (!badValue(inline)) return inline;
      for (let offset = 1; offset <= 4; offset += 1) {
        const next = clean(allLines[i + offset]);
        if (!badValue(next) && !/^section\s+\d/i.test(next)) return next;
      }
    }
  }
  return '';
}

function pickRegex(text, patterns) {
  const flat = stripHtml(text).replace(/\n+/g, '  ');
  for (const pattern of patterns) {
    const match = flat.match(pattern);
    if (match?.[1] && !badValue(match[1])) return clean(match[1].replace(/\s{2,}.*/, ''));
  }
  return '';
}

function cleanupName(value = '') {
  return clean(value)
    .replace(/\.(pdf|php|aspx?|html?)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(sds|msds|safety data sheet|viewer|view|download|english|en|us|usa)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameFromUrl(url = '') {
  try {
    const parsed = new URL(url);
    for (const [key, value] of parsed.searchParams.entries()) {
      if (URL_NAME_KEYS.includes(key.toLowerCase())) {
        const candidate = cleanupName(value);
        if (candidate.length >= 3 && !JUNK_NAMES.test(candidate)) return candidate;
      }
    }
    for (const value of parsed.searchParams.values()) {
      const candidate = cleanupName(value);
      if (candidate.length >= 3 && /[a-z]/i.test(candidate) && !JUNK_NAMES.test(candidate)) return candidate;
    }
    const last = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    const candidate = cleanupName(last);
    if (candidate.length >= 3 && !JUNK_NAMES.test(candidate)) return candidate;
  } catch {}
  return '';
}

function titleFromHtml(raw = '') {
  const candidates = [
    String(raw).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    String(raw).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1],
    String(raw).match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]
  ];
  for (const value of candidates) {
    const candidate = cleanupName(stripHtml(value || ''));
    if (candidate.length >= 3 && !JUNK_NAMES.test(candidate)) return candidate;
  }
  return '';
}

function sectionBetween(text, starts, ends) {
  const normalized = stripHtml(text).replace(/\r/g, '\n');
  const start = normalized.match(new RegExp(starts.join('|'), 'i'));
  if (!start) return '';
  const chunk = normalized.slice(start.index || 0, (start.index || 0) + 7000);
  const end = chunk.slice(start[0].length).match(new RegExp(ends.join('|'), 'i'));
  return end ? chunk.slice(0, start[0].length + (end.index || 0)) : chunk;
}

function compositionFromText(text) {
  const chunk = sectionBetween(text, ['SECTION\\s*3', 'COMPOSITION\\s*/\\s*INFORMATION', 'Hazardous ingredients', 'Ingredients'], ['SECTION\\s*4', 'FIRST[-\\s]*AID', 'SECTION\\s*5']);
  const found = [];
  const seen = new Set();
  for (const line of lines(chunk || text)) {
    if (/\b\d{2,7}-\d{2}-\d\b/.test(line) || /\b\d+(\.\d+)?\s*[-–—]?\s*\d*\s*%\b/.test(line)) {
      const cleaned = clean(line.replace(/\bTrade secret\b/gi, '').replace(/\bProprietary\b/gi, ''));
      if (cleaned.length > 5 && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        found.push(cleaned);
      }
    }
    if (found.length >= 6) break;
  }
  return found.join('; ');
}

export function extractSdsFields(text, url) {
  const allLines = lines(text);
  const casMatches = [...new Set((String(text || '').match(CAS_PATTERN) || []).filter(Boolean))];
  return {
    chemical_name: lineAfterLabel(allLines, ['Product name', 'Product identifier', 'Product Identity', 'Material name', 'Trade name', 'Chemical name', 'Product']) || pickRegex(text, [/Product\s*(?:name|identifier|identity)?\s*[:#\-–—]\s*([^\n\r]{2,120})/i, /Material\s*name\s*[:#\-–—]\s*([^\n\r]{2,120})/i, /Trade\s*name\s*[:#\-–—]\s*([^\n\r]{2,120})/i]) || titleFromHtml(text) || nameFromUrl(url),
    manufacturer: lineAfterLabel(allLines, ['Manufacturer', 'Supplier', 'Company', 'Distributed by', 'Responsible party', 'Company name', 'Manufacturer/Supplier']) || pickRegex(text, [/(?:Manufacturer|Supplier|Company|Distributed by|Responsible party|Company name)\s*[:#\-–—]\s*([^\n\r]{2,160})/i]),
    product_code: lineAfterLabel(allLines, ['Product code', 'Product number', 'Item number', 'Part number', 'SDS number', 'Material number', 'Catalog number']) || pickRegex(text, [/(?:Product code|Product number|Item number|Part number|SDS number|Material number|Catalog number)\s*[:#\-–—]\s*([^\n\r]{2,80})/i]),
    cas_number: casMatches[0] || '',
    composition: compositionFromText(text),
    sds_url: url
  };
}

export function discoverEmbeddedSdsLinks(raw = '', baseUrl = '') {
  const found = new Set();
  const html = String(raw || '');
  const attrRegex = /(?:href|src|data|data-url|data-src|url)\s*=\s*["']([^"']+)["']/gi;
  const literalRegex = /https?:\/\/[^\s"'<>]+/gi;
  let match;
  const add = (value) => {
    try {
      const absolute = new URL(clean(value).replace(/\\\//g, '/'), baseUrl).toString();
      if (absolute !== baseUrl && /(pdf|sds|msds|download|document|doc|file|viewer|view)/i.test(absolute)) found.add(absolute);
    } catch {}
  };
  while ((match = attrRegex.exec(html))) add(match[1]);
  while ((match = literalRegex.exec(html))) add(match[0]);
  return [...found].slice(0, 6);
}

export async function fetchReadableText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ChemicalSearchBackend/1.0', Accept: 'application/pdf,text/html,text/plain,*/*' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const type = res.headers.get('content-type') || '';
  const bytes = await res.arrayBuffer();
  if (/pdf/i.test(type) || /\.pdf($|\?)/i.test(url)) {
    const parsed = await pdfParse(Buffer.from(bytes));
    return parsed.text || '';
  }
  return Buffer.from(bytes).toString('utf8');
}

export function fieldCount(fields = {}) {
  return Object.entries(fields).filter(([key, value]) => key !== 'sds_url' && clean(value)).length;
}

export function mergeMissingFields(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (!clean(target[key]) && clean(value)) target[key] = value;
  }
  return target;
}
