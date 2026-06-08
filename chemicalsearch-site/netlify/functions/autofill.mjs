import pdfParse from "pdf-parse";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const TRUSTED_SDS_DOMAINS = [
  "cloroxpro.com",
  "thecloroxcompany.com",
  "diversey.com",
  "diverseyvericlean.com",
  "ecolab.com",
  "grainger.com",
  "sds.chemtel.net",
  "sdsmanager.com",
  "fisher.com",
  "fishersci.com",
  "sigmaaldrich.com",
  "msdsdigital.com",
  "ucsd.edu",
  "ehs.harvard.edu",
  "cameochemicals.noaa.gov",
  "uline.com",
  "img.uline.com",
  "simplegreen.com",
  "cdn.simplegreen.com",
  "rbnainfo.com",
  "crcindustries.com",
  "markem-imaje.com",
  "wd40.com",
  "grainger.com",
  "homedepot-static.com",
  "images.thdstatic.com"
];

const CAS_PATTERN = /\b\d{2,7}-\d{2}-\d\b/g;
const CAS_SINGLE_PATTERN = /\b\d{2,7}-\d{2}-\d\b/;

function response(statusCode, payload) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) };
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstUseful(...values) {
  return values.map(clean).find(Boolean) || "";
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return {};
  }
}

function buildLookupTerm(fields = {}) {
  return firstUseful(fields.chemical_name, fields.product_name, fields.cas_number, fields.composition, fields.product_code, fields.manufacturer, fields.sds_url);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", "User-Agent": "ChemicalSearchSDSAutofill/1.0", ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "User-Agent": "ChemicalSearchSDSAutofill/1.0", ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const contentType = res.headers.get("content-type") || "";
  const arrayBuffer = await res.arrayBuffer();
  if (/pdf/i.test(contentType) || /\.pdf($|\?)/i.test(url)) {
    const parsed = await pdfParse(Buffer.from(arrayBuffer));
    return parsed.text || "";
  }
  return Buffer.from(arrayBuffer).toString("utf8");
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function textLines(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => clean(stripHtml(line)))
    .filter(Boolean);
}

function lineAfterLabel(lines, labels) {
  const labelList = labels.map((label) => label.toLowerCase());
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();
    for (const label of labelList) {
      if (lower.startsWith(label)) {
        const remainder = clean(line.slice(label.length).replace(/^[:\-\s]+/, ""));
        if (remainder && !/^not available|n\/a$/i.test(remainder)) return remainder;
        for (let offset = 1; offset <= 3; offset += 1) {
          const next = clean(lines[index + offset]);
          if (next && !/^(section|page|safety data sheet)$/i.test(next)) return next;
        }
      }
    }
  }
  return "";
}

function sectionBetween(text, startPatterns, endPatterns) {
  const normalized = String(text || "").replace(/\r/g, "\n");
  const startRegex = new RegExp(startPatterns.join("|"), "i");
  const startMatch = normalized.match(startRegex);
  if (!startMatch) return "";
  const startIndex = startMatch.index || 0;
  const remainder = normalized.slice(startIndex, startIndex + 5000);
  const endRegex = new RegExp(endPatterns.join("|"), "i");
  const endMatch = remainder.slice(startMatch[0].length).match(endRegex);
  return endMatch ? remainder.slice(0, startMatch[0].length + (endMatch.index || 0)) : remainder;
}

function extractComposition(text) {
  const compositionText = sectionBetween(
    text,
    ["SECTION\\s*3[.:\\-\\s]+COMPOSITION", "COMPOSITION\\s*/\\s*INFORMATION", "Hazardous ingredients", "Ingredients"],
    ["SECTION\\s*4", "FIRST[-\\s]*AID", "SECTION\\s*5", "FIRE[-\\s]*FIGHTING"]
  );
  const source = compositionText || text;
  const lines = textLines(source);
  const ingredientLines = [];
  const seen = new Set();
  for (const line of lines) {
    if (CAS_SINGLE_PATTERN.test(line) || /\b\d+(\.\d+)?\s*[-–—]?\s*\d*\s*%\b/.test(line)) {
      const cleaned = clean(line.replace(/\bTrade secret\b/gi, "").replace(/\bProprietary\b/gi, ""));
      if (cleaned.length > 5 && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        ingredientLines.push(cleaned);
      }
    }
    if (ingredientLines.length >= 5) break;
  }
  return ingredientLines.join("; ");
}

function extractSdsFields(text, url) {
  const raw = String(text || "");
  const lines = textLines(raw);
  const casMatches = [...new Set((raw.match(CAS_PATTERN) || []).filter(Boolean))];
  const chemicalName = firstUseful(
    lineAfterLabel(lines, ["Product name", "Product identifier", "Product Identity", "Material name", "Chemical name"]),
    lines.find((line) => /safety data sheet/i.test(line)) ? "" : ""
  );
  const manufacturer = firstUseful(
    lineAfterLabel(lines, ["Manufacturer", "Supplier", "Company", "Distributed by", "Responsible party"]),
    ""
  );
  const productCode = firstUseful(
    lineAfterLabel(lines, ["Product code", "Product number", "Item number", "Part number", "SDS number"]),
    ""
  );
  const composition = extractComposition(raw);
  return {
    chemical_name: chemicalName,
    manufacturer,
    product_code: productCode,
    cas_number: casMatches[0] || "",
    composition,
    sds_url: url
  };
}

async function lookupSubmittedSds(url) {
  if (!clean(url)) return null;
  const text = await fetchText(url);
  const fields = extractSdsFields(text, url);
  const extractedCount = Object.entries(fields).filter(([key, value]) => key !== "sds_url" && clean(value)).length;
  return {
    confidence: isTrustedSdsUrl(url) ? Math.min(0.95, 0.7 + extractedCount * 0.05) : Math.min(0.8, 0.5 + extractedCount * 0.05),
    source: "Submitted SDS document",
    source_type: "sds_document_parse",
    fields,
    notes: [
      `Parsed submitted SDS link: ${url}`,
      extractedCount ? `Extracted ${extractedCount} field(s) from the SDS text.` : "Could not extract structured fields from the SDS text.",
      "Verify all extracted values against the visible SDS before submitting."
    ],
    links: [{ label: "Submitted SDS", url }]
  };
}

function findCas(synonyms = []) {
  return synonyms.map(clean).find((item) => CAS_SINGLE_PATTERN.test(item)) || "";
}

function pubChemCandidate(data, term) {
  const properties = data.properties || {};
  const synonyms = data.synonyms || [];
  const cid = data.cid;
  if (!cid) return null;
  return {
    confidence: data.confidence || 0.68,
    source: "PubChem",
    source_type: "chemical_identity",
    fields: {
      chemical_name: firstUseful(properties.Title, term),
      cas_number: findCas(synonyms),
      composition: properties.MolecularFormula || ""
    },
    notes: [
      `PubChem CID ${cid}`,
      `PubChem URL: https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      properties.IUPACName ? `IUPAC name: ${properties.IUPACName}` : "",
      properties.MolecularWeight ? `Molecular weight: ${properties.MolecularWeight}` : "",
      properties.CanonicalSMILES ? `Canonical SMILES: ${properties.CanonicalSMILES}` : "",
      "Chemical identity only. Product-specific SDS, supplier, and product code require official SDS verification."
    ].filter(Boolean),
    links: [{ label: "PubChem", url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}` }]
  };
}

async function lookupPubChem(term) {
  if (/^https?:\/\//i.test(term)) return null;
  const encoded = encodeURIComponent(term);
  const cidData = await fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`);
  const cid = cidData?.IdentifierList?.CID?.[0];
  if (!cid) return null;
  const [propertiesData, synonymsData] = await Promise.all([
    fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON`),
    fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`).catch(() => null)
  ]);
  return pubChemCandidate({ cid, properties: propertiesData?.PropertyTable?.Properties?.[0] || {}, synonyms: synonymsData?.InformationList?.Information?.[0]?.Synonym || [], confidence: CAS_SINGLE_PATTERN.test(term) ? 0.82 : 0.7 }, term);
}

function buildSearchQuery(term, fields = {}) {
  const parts = [firstUseful(fields.chemical_name, fields.product_name, term), fields.product_code, fields.manufacturer, "SDS PDF safety data sheet"].filter(Boolean);
  return parts.join(" ");
}

function isTrustedSdsUrl(url = "") {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return TRUSTED_SDS_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

async function lookupSdsSearch(term, fields = {}) {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  const googleKey = process.env.GOOGLE_CSE_API_KEY;
  const googleCx = process.env.GOOGLE_CSE_CX;
  const query = buildSearchQuery(term, fields);
  if (braveKey) {
    const data = await fetchJson(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, { headers: { "X-Subscription-Token": braveKey } });
    return parseSearchResults(data?.web?.results || [], "Brave Search", query);
  }
  if (googleKey && googleCx) {
    const data = await fetchJson(`https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(query)}&num=5`);
    return parseSearchResults((data?.items || []).map((item) => ({ title: item.title, url: item.link, description: item.snippet })), "Google Custom Search", query);
  }
  return {
    confidence: 0.25,
    source: "SDS search not configured",
    source_type: "sds_search_guidance",
    fields: {},
    notes: ["Product-specific SDS search requires BRAVE_SEARCH_API_KEY or GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX in Netlify environment variables."],
    links: [{ label: "Manual SDS search", url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }]
  };
}

function parseSearchResults(results, provider, query) {
  const candidates = results.map((item) => ({ title: item.title || "SDS result", url: item.url || item.link || "", description: item.description || item.snippet || "" })).filter((item) => item.url);
  const trusted = candidates.find((item) => isTrustedSdsUrl(item.url));
  const pdf = candidates.find((item) => /\.pdf($|\?)/i.test(item.url));
  const best = trusted || pdf || candidates[0];
  if (!best) return { confidence: 0.2, source: provider, source_type: "sds_search", fields: {}, notes: [`No SDS search result found for: ${query}`], links: [] };
  return {
    confidence: trusted ? 0.78 : pdf ? 0.62 : 0.48,
    source: provider,
    source_type: "sds_search",
    fields: { sds_url: best.url },
    notes: [`Possible SDS result from ${provider}: ${best.title}`, best.description, trusted ? "Domain is on the trusted SDS/source allowlist." : "Result requires manual verification before use."].filter(Boolean),
    links: candidates.slice(0, 5).map((item) => ({ label: item.title, url: item.url }))
  };
}

function mergeCandidates(candidates = []) {
  const merged = { confidence: 0, fields: {}, notes: [], sources: [], links: [], needs_verification: true };
  for (const candidate of candidates.filter(Boolean)) {
    merged.confidence = Math.max(merged.confidence, candidate.confidence || 0);
    merged.sources.push({ source: candidate.source, source_type: candidate.source_type, confidence: candidate.confidence });
    Object.entries(candidate.fields || {}).forEach(([key, value]) => {
      if (!clean(merged.fields[key]) && clean(value)) merged.fields[key] = value;
    });
    merged.notes.push(...(candidate.notes || []));
    merged.links.push(...(candidate.links || []));
  }
  merged.notes = [...new Set(merged.notes.map(clean).filter(Boolean))];
  const seenLinks = new Set();
  merged.links = merged.links.filter((link) => {
    if (!link?.url || seenLinks.has(link.url)) return false;
    seenLinks.add(link.url);
    return true;
  });
  return merged;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: JSON_HEADERS, body: "" };
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed" });
  const body = parseBody(event);
  const fields = body.fields || body;
  const term = buildLookupTerm(fields);
  if (term.length < 2) return response(400, { error: "Enter at least one product, CAS, supplier, composition, or SDS field." });
  const candidates = [];
  await Promise.allSettled([
    clean(fields.sds_url) ? lookupSubmittedSds(fields.sds_url).then((result) => result && candidates.push(result)) : Promise.resolve(),
    lookupPubChem(term).then((result) => result && candidates.push(result)),
    lookupSdsSearch(term, fields).then((result) => result && candidates.push(result))
  ]);
  if (clean(fields.sds_url) && !candidates.some((candidate) => candidate.source_type === "sds_document_parse")) {
    candidates.push({
      confidence: isTrustedSdsUrl(fields.sds_url) ? 0.85 : 0.55,
      source: "Submitted SDS link",
      source_type: "user_supplied_sds",
      fields: { sds_url: fields.sds_url },
      notes: [isTrustedSdsUrl(fields.sds_url) ? "Submitted SDS link is on a trusted domain." : "Submitted SDS link requires verification."],
      links: [{ label: "Submitted SDS", url: fields.sds_url }]
    });
  }
  const result = mergeCandidates(candidates);
  return response(200, { query: term, ...result, warning: "Autofill is a review aid only. Always verify against the current official SDS before adding or using safety data." });
}
