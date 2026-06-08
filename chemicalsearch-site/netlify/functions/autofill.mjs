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
  "cameochemicals.noaa.gov"
];

const CAS_PATTERN = /\b\d{2,7}-\d{2}-\d\b/;

function response(statusCode, payload) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  };
}

function clean(value) {
  return String(value || "").trim();
}

function normalize(value) {
  return clean(value).toLowerCase();
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
  return firstUseful(
    fields.chemical_name,
    fields.product_name,
    fields.cas_number,
    fields.composition,
    fields.product_code,
    fields.manufacturer,
    fields.sds_url
  );
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "User-Agent": "ChemicalSearchSDSAutofill/1.0",
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function findCas(synonyms = []) {
  return synonyms.map(clean).find((item) => CAS_PATTERN.test(item)) || "";
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
  const encoded = encodeURIComponent(term);
  const cidData = await fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`);
  const cid = cidData?.IdentifierList?.CID?.[0];
  if (!cid) return null;

  const [propertiesData, synonymsData] = await Promise.all([
    fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON`),
    fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`).catch(() => null)
  ]);

  return pubChemCandidate({
    cid,
    properties: propertiesData?.PropertyTable?.Properties?.[0] || {},
    synonyms: synonymsData?.InformationList?.Information?.[0]?.Synonym || [],
    confidence: CAS_PATTERN.test(term) ? 0.82 : 0.7
  }, term);
}

function buildSearchQuery(term, fields = {}) {
  const parts = [
    firstUseful(fields.chemical_name, fields.product_name, term),
    fields.product_code,
    fields.manufacturer,
    "SDS PDF safety data sheet"
  ].filter(Boolean);
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
    const data = await fetchJson(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      headers: { "X-Subscription-Token": braveKey }
    });
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
    notes: [
      "Product-specific SDS autofill requires a configured search provider or SDS database.",
      "Set BRAVE_SEARCH_API_KEY or GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX in Netlify environment variables."
    ],
    links: [{ label: "Manual SDS search", url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }]
  };
}

function parseSearchResults(results, provider, query) {
  const candidates = results
    .map((item) => ({
      title: item.title || "SDS result",
      url: item.url || item.link || "",
      description: item.description || item.snippet || ""
    }))
    .filter((item) => item.url);

  const trusted = candidates.find((item) => isTrustedSdsUrl(item.url));
  const pdf = candidates.find((item) => /\.pdf($|\?)/i.test(item.url));
  const best = trusted || pdf || candidates[0];

  if (!best) {
    return {
      confidence: 0.2,
      source: provider,
      source_type: "sds_search",
      fields: {},
      notes: [`No SDS search result found for: ${query}`],
      links: []
    };
  }

  return {
    confidence: trusted ? 0.78 : pdf ? 0.62 : 0.48,
    source: provider,
    source_type: "sds_search",
    fields: {
      sds_url: best.url
    },
    notes: [
      `Possible SDS result from ${provider}: ${best.title}`,
      best.description,
      trusted ? "Domain is on the trusted SDS/source allowlist." : "Result requires manual verification before use."
    ].filter(Boolean),
    links: candidates.slice(0, 5).map((item) => ({ label: item.title, url: item.url }))
  };
}

function mergeCandidates(candidates = []) {
  const merged = {
    confidence: 0,
    fields: {},
    notes: [],
    sources: [],
    links: [],
    needs_verification: true
  };

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

  if (clean(fields.sds_url)) {
    candidates.push({
      confidence: isTrustedSdsUrl(fields.sds_url) ? 0.85 : 0.55,
      source: "Submitted SDS link",
      source_type: "user_supplied_sds",
      fields: { sds_url: fields.sds_url },
      notes: [isTrustedSdsUrl(fields.sds_url) ? "Submitted SDS link is on a trusted domain." : "Submitted SDS link requires verification."],
      links: [{ label: "Submitted SDS", url: fields.sds_url }]
    });
  }

  await Promise.allSettled([
    lookupPubChem(term).then((result) => result && candidates.push(result)),
    lookupSdsSearch(term, fields).then((result) => result && candidates.push(result))
  ]);

  const result = mergeCandidates(candidates);
  return response(200, {
    query: term,
    ...result,
    warning: "Autofill is a review aid only. Always verify against the current official SDS before adding or using safety data."
  });
}
