const REVIEW_EMAIL = "safety-review@example.com";
const REVIEW_ACTION_BASE_URL = "https://your-domain.example/review";
const REQUEST_KEY = "chemicalSdsLookup.requests.v1";

const records = Array.isArray(globalThis.SDS_RECORDS)
  ? [...globalThis.SDS_RECORDS].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
  : [];

let currentQuery = "";
let currentFilter = "all";
let currentSort = "name";

function injectEnhancementStyles() {
  if (document.getElementById("sds-enhancement-styles")) return;
  const style = document.createElement("style");
  style.id = "sds-enhancement-styles";
  style.textContent = `
    .topbar{background:rgba(21,53,79,.98);color:#fff}.brand-subtitle{color:#d4e2ed}.nav-actions .secondary{background:#fff}.hero{background:linear-gradient(135deg,#102b43,#1264a3);color:#fff}.hero .lead{color:#dbeafe}.hero .eyebrow{background:rgba(255,255,255,.14);color:#fff}.hero .search-panel{background:#fff;color:var(--ink);border-radius:14px}.hero-inner{grid-template-columns:minmax(0,.95fr) minmax(360px,1.05fr)}.dashboard-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.metric-card{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:12px}.metric-value{display:block;font-size:1.45rem;font-weight:900}.metric-label{font-size:.82rem;color:#dbeafe}.filter-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.filter-tabs{display:flex;gap:8px;flex-wrap:wrap}.filter-chip.is-selected{background:#1264a3;color:#fff;border-color:#1264a3}.sort-control{display:flex;align-items:center;gap:8px}.sort-control select{min-height:38px;border:1px solid var(--line);border-radius:999px;padding:0 12px;background:#fff}.chemical-card{border-radius:14px;grid-template-columns:10px 1fr}.chemical-name{font-size:1.05rem}.card-badges{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.risk-pill,.ghs-pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 8px;font-weight:800;font-size:.72rem}.risk-low{background:#eaf7ef;color:#28784a}.risk-moderate{background:#fff7da;color:#9a6500}.risk-high,.risk-extreme{background:#fff0ed;color:#b42318}.ghs-pill{background:#eaf4ff;color:#0d4d7d}.detail-header{background:linear-gradient(135deg,#fff,#edf7ff);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:var(--shadow);display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.detail-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.hazard-overview{display:grid;grid-template-columns:220px 1fr;gap:14px}.nfpa-card{display:grid;place-items:center}.nfpa-diamond{width:150px;height:150px;position:relative;transform:rotate(45deg);margin:12px}.nfpa-cell{position:absolute;width:72px;height:72px;display:grid;place-items:center;border:2px solid #fff;font-weight:900;font-size:1.25rem}.nfpa-cell span{transform:rotate(-45deg)}.nfpa-health{left:0;top:39px;background:#2563eb;color:#fff}.nfpa-fire{left:39px;top:0;background:#dc2626;color:#fff}.nfpa-reactivity{right:0;top:39px;background:#f59e0b;color:#111}.nfpa-special{left:39px;bottom:0;background:#fff;color:#111}.sds-section-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.sds-section-grid .panel{min-height:150px}.emergency-strip{position:sticky;top:68px;z-index:19;background:#fff;border-bottom:1px solid var(--line)}.emergency-strip-inner{grid-template-columns:repeat(3,minmax(0,1fr))}.hotline.neutral{background:#15354f}.incident-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.incident-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px}.not-found-block{padding:18px;border:1px dashed var(--line);border-radius:14px;background:#fff}.footer{background:#fff;border-top:1px solid var(--line)}@media(max-width:850px){.hero-inner,.dashboard-row,.hazard-overview,.sds-section-grid,.incident-grid{grid-template-columns:1fr}.detail-header{display:block}.emergency-strip-inner{grid-template-columns:1fr}.search-row{grid-template-columns:1fr}.sort-control{width:100%;justify-content:space-between}.sort-control select{flex:1}}
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanValue(value) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "n/a") return "";
  return text;
}

function displayValue(value) {
  return escapeHtml(cleanValue(value) || "Not listed");
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadRequests() {
  try {
    const stored = JSON.parse(localStorage.getItem(REQUEST_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn("Unable to load saved requests", error);
    return [];
  }
}

function saveRequests(requests) {
  localStorage.setItem(REQUEST_KEY, JSON.stringify(requests));
}

function formatDate(value) {
  const text = cleanValue(value);
  if (!text) return "Not listed";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  return text;
}

function parseHfrp(record) {
  const raw = cleanValue(record.hfrp_info);
  const parts = raw.split("/").map((part) => part.trim());
  const number = (index) => {
    const parsed = Number.parseInt(parts[index], 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    raw,
    health: number(0),
    fire: number(1),
    reactivity: number(2),
    special: parts[3] && parts[3] !== "0" ? parts[3] : ""
  };
}

function riskInfo(record) {
  const hfrp = parseHfrp(record);
  const max = Math.max(hfrp.health, hfrp.fire, hfrp.reactivity);
  if (max >= 4) return { label: "Extreme", className: "risk-extreme", rank: 4 };
  if (max === 3) return { label: "High", className: "risk-high", rank: 3 };
  if (max === 2) return { label: "Moderate", className: "risk-moderate", rank: 2 };
  return { label: "Low", className: "risk-low", rank: 1 };
}

function inferTags(record) {
  const text = normalize([record.name, record.use, record.composition, record.hfrp_info].join(" "));
  const tags = [];
  if (/bleach|hypochlorite|chlorine/.test(text)) tags.push("oxidizer");
  if (/acid|corrosive|hydrochloric|muriatic|toilet bowl/.test(text)) tags.push("corrosive");
  if (/alcohol|aerosol|propane|butane|solvent|lubricant|flammable/.test(text)) tags.push("flammable");
  if (/cleaner|detergent|fragrance|freshener|irritant/.test(text)) tags.push("irritant");
  if (!tags.length) tags.push("general");
  return [...new Set(tags)];
}

function ghsLabels(record) {
  const tags = inferTags(record);
  const labels = {
    oxidizer: "Oxidizer",
    corrosive: "Corrosive",
    flammable: "Flammable",
    irritant: "Irritant",
    general: "SDS"
  };
  return tags.map((tag) => labels[tag] || tag);
}

function searchableValues(record) {
  return [
    "sds",
    "safety data sheet",
    record.name,
    record.company,
    record.product_code,
    record.use,
    record.sds_number,
    record.sds_version,
    record.issue_date,
    record.revision_date,
    record.supersedes_date,
    record.composition,
    record.hfrp_info,
    record.sds_reference,
    record.sds_url,
    ...inferTags(record),
    ...ghsLabels(record)
  ];
}

function matchesRecord(record, query) {
  const q = normalize(query);
  const matchesQuery = !q || searchableValues(record).some((value) => normalize(value).includes(q));
  const matchesFilter = currentFilter === "all" || inferTags(record).includes(currentFilter) || riskInfo(record).label.toLowerCase() === currentFilter;
  return matchesQuery && matchesFilter;
}

function resultScore(record) {
  const q = normalize(currentQuery);
  if (!q) return 3;
  const values = searchableValues(record).map(normalize);
  if (values.some((value) => value === q)) return 0;
  if (values.some((value) => value.startsWith(q))) return 1;
  if (values.some((value) => value.includes(q))) return 2;
  return 3;
}

function searchResults() {
  const results = records.filter((record) => matchesRecord(record, currentQuery));
  return results.sort((a, b) => {
    if (currentSort === "risk") return riskInfo(b).rank - riskInfo(a).rank || String(a.name || "").localeCompare(String(b.name || ""));
    if (currentSort === "updated") return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    return resultScore(a) - resultScore(b) || String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function bindRouteButtons(scope = document) {
  scope.querySelectorAll("[data-route]:not([data-bound])").forEach((button) => {
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const route = button.dataset.route;
      if (route === "home") location.hash = "#/";
      if (route === "add-chemical") location.hash = "#/add-chemical";
    });
  });

  scope.querySelectorAll("[data-chemical-id]:not([data-bound])").forEach((button) => {
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      location.hash = `#/chemical/${button.dataset.chemicalId}`;
    });
  });
}

function layout(content, options = {}) {
  const { showHero = false, pageClass = "" } = options;
  document.getElementById("app").innerHTML = `
    <div class="shell ${escapeHtml(pageClass)}">
      <header class="topbar">
        <div class="topbar-inner">
          <button class="brand" data-route="home" aria-label="Go to search">
            <span class="brand-mark" aria-hidden="true">CS</span>
            <span class="brand-copy">
              <span class="brand-title">ChemicalSearch</span>
              <span class="brand-subtitle">SDS safety lookup portal</span>
            </span>
          </button>
          <nav class="nav-actions" aria-label="Primary">
            <button class="button secondary compact" data-route="home">Search</button>
            <button class="button primary compact" data-route="add-chemical">Missing chemical</button>
          </nav>
        </div>
      </header>
      <section class="emergency-strip" aria-label="Emergency links">
        <div class="emergency-strip-inner">
          <a class="hotline critical" href="tel:911"><span><span class="hotline-label">Emergency</span><br><span class="hotline-copy">Call 911 for serious exposure</span></span><strong>911</strong></a>
          <a class="hotline poison" href="tel:18002221222"><span><span class="hotline-label">Poison Control</span><br><span class="hotline-copy">United States hotline</span></span><strong>1-800-222-1222</strong></a>
          <button class="hotline neutral" data-route="add-chemical" type="button"><span><span class="hotline-label">Unknown product</span><br><span class="hotline-copy">Capture label details</span></span><strong>Intake</strong></button>
        </div>
      </section>
      ${showHero ? hero() : ""}
      <main class="main">${content}</main>
      <footer class="footer">
        <div class="footer-inner">
          Internal reference only. Confirm procedures against the current SDS, product label, and your site requirements.
        </div>
      </footer>
    </div>
  `;
  bindRouteButtons();
}

function hero() {
  const highRiskCount = records.filter((record) => riskInfo(record).rank >= 3).length;
  const linkedCount = records.filter((record) => cleanValue(record.sds_url)).length;
  const companies = new Set(records.map((record) => cleanValue(record.company)).filter(Boolean)).size;
  return `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">SDS-inspired chemical safety reference</span>
          <h1>Search chemical products, hazard indicators, SDS references, and response notes.</h1>
          <p class="lead">Designed like a practical safety portal: fast lookup, risk badges, HFRP/NFPA-style ratings, official SDS links, and a missing-chemical request workflow.</p>
          <div class="trust-row">
            <span>Product lookup</span><span>HFRP ratings</span><span>SDS links</span><span>Review workflow</span>
          </div>
          <div class="dashboard-row" aria-label="Library metrics">
            <div class="metric-card"><span class="metric-value">${records.length}</span><span class="metric-label">records</span></div>
            <div class="metric-card"><span class="metric-value">${linkedCount}</span><span class="metric-label">SDS links</span></div>
            <div class="metric-card"><span class="metric-value">${highRiskCount}</span><span class="metric-label">high-priority</span></div>
            <div class="metric-card"><span class="metric-value">${companies}</span><span class="metric-label">suppliers</span></div>
          </div>
        </div>
        <div class="search-panel">
          <form id="searchForm" class="search-row" role="search">
            <label class="sr-only" for="searchInput">Search SDS records</label>
            <input id="searchInput" class="search-input" value="${escapeHtml(currentQuery)}" placeholder="Search cleaner, bleach, company, product code, composition..." autocomplete="off" />
            <button class="button primary" type="submit">Search</button>
          </form>
          <div class="quick-searches" aria-label="Common searches">
            ${["Cleaner", "Bleach", "Lubricant", "Corrosive", "Flammable"].map((query) => `<button class="quick-chip" data-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderHome() {
  layout(`
    <section class="panel results-panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">Safety library</span>
          <h2 id="resultsTitle">Search Results</h2>
          <p id="resultsMeta" class="meta"></p>
        </div>
      </div>
      <div class="filter-toolbar">
        <div class="filter-tabs" aria-label="Filter records">
          ${[
            ["all", "All"],
            ["high", "High risk"],
            ["flammable", "Flammable"],
            ["corrosive", "Corrosive"],
            ["oxidizer", "Oxidizer"],
            ["irritant", "Irritant"]
          ].map(([value, label]) => `<button class="filter-chip ${currentFilter === value ? "is-selected" : ""}" data-filter="${value}" type="button">${label}</button>`).join("")}
        </div>
        <label class="sort-control">Sort
          <select id="sortSelect">
            <option value="name" ${currentSort === "name" ? "selected" : ""}>Best match / name</option>
            <option value="risk" ${currentSort === "risk" ? "selected" : ""}>Risk level</option>
            <option value="updated" ${currentSort === "updated" ? "selected" : ""}>Recently updated</option>
          </select>
        </label>
      </div>
      <div id="resultsList" class="cards" aria-live="polite"></div>
    </section>
    <section class="panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow danger-text">Exposure workflow</span>
          <h2>Fast response checklist</h2>
          <p class="meta">Use this only as a routing aid. The current SDS and emergency instructions control.</p>
        </div>
      </div>
      <div class="incident-grid">
        ${incidentCard("Skin", "Remove contaminated clothing and rinse affected area. Escalate for irritation, burns, or unknown chemicals.")}
        ${incidentCard("Eyes", "Begin eyewash immediately and seek urgent help for pain, impaired vision, or corrosive products.")}
        ${incidentCard("Inhalation", "Move to fresh air if safe. Call emergency services for breathing difficulty or toxic vapor exposure.")}
        ${incidentCard("Ingestion", "Do not induce vomiting unless directed. Contact Poison Control or medical personnel.")}
      </div>
    </section>
  `, { showHero: true });

  renderResults();

  document.getElementById("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    currentQuery = document.getElementById("searchInput").value.trim();
    renderResults();
  });

  document.getElementById("searchInput").addEventListener("input", (event) => {
    currentQuery = event.target.value;
    renderResults();
  });

  document.querySelectorAll("[data-query]").forEach((button) => {
    button.addEventListener("click", () => {
      currentQuery = button.dataset.query;
      const input = document.getElementById("searchInput");
      input.value = currentQuery;
      renderResults();
      input.focus();
    });
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      renderHome();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", (event) => {
    currentSort = event.target.value;
    renderResults();
  });
}

function incidentCard(title, copy) {
  return `<article class="incident-card"><h3>${escapeHtml(title)}</h3><p class="meta">${escapeHtml(copy)}</p></article>`;
}

function renderResults() {
  const results = searchResults();
  const meta = document.getElementById("resultsMeta");
  const list = document.getElementById("resultsList");
  if (!meta || !list) return;
  meta.textContent = `${results.length} result${results.length === 1 ? "" : "s"} in ${records.length} SDS records.`;
  list.innerHTML = results.length ? results.map(recordCard).join("") : notFoundPrompt(currentQuery);
  bindRouteButtons(list);
}

function recordCard(record) {
  const subline = [record.company, cleanValue(record.product_code) ? `Code ${record.product_code}` : ""].filter(Boolean).join(" | ");
  const composition = cleanValue(record.composition) || "See SDS for composition details.";
  const risk = riskInfo(record);
  const hfrp = parseHfrp(record);
  const ghs = ghsLabels(record).map((label) => `<span class="ghs-pill">${escapeHtml(label)}</span>`).join("");
  return `
    <button class="chemical-card hazard-${risk.label.toLowerCase()}" data-chemical-id="${escapeHtml(record.id)}">
      <span class="hazard-rail" aria-hidden="true"></span>
      <span class="card-content">
        <span class="card-top">
          <span>
            <strong class="chemical-name">${escapeHtml(record.name)}</strong>
            <span class="meta">${escapeHtml(subline || "Product details")}</span>
          </span>
        </span>
        <span class="card-badges">
          <span class="risk-pill ${risk.className}">${risk.label} priority</span>
          ${ghs}
          ${hfrp.raw ? `<span class="ghs-pill">HFRP ${escapeHtml(hfrp.raw)}</span>` : ""}
        </span>
        <span class="card-preview">
          <span><strong>Use:</strong> ${displayValue(record.use)}</span>
          <span><strong>Composition:</strong> ${escapeHtml(composition)}</span>
        </span>
        <span class="card-footer">
          <span>Updated ${escapeHtml(formatDate(record.updated_at))}</span>
          <span class="open-label">Open SDS record</span>
        </span>
      </span>
    </button>
  `;
}

function notFoundPrompt(query) {
  return `
    <div class="not-found-block">
      <div class="banner">
        <strong>No SDS record found</strong>
        No record matched "${escapeHtml(query || "your search")}".
      </div>
      <p class="meta">Collect the product name, manufacturer, product code, label photo, SDS URL, and exposure route if this is incident-related.</p>
      <div class="not-found-actions">
        <button class="button primary" data-route="add-chemical">Request this chemical</button>
        <button class="button secondary" data-route="home">Back to search</button>
      </div>
    </div>
  `;
}

function summaryRows(rows) {
  return `
    <dl class="summary-list compact-list">
      ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${displayValue(value)}</dd></div>`).join("")}
    </dl>
  `;
}

function sdsPanel(record) {
  const reference = cleanValue(record.sds_reference);
  if (!record.sds_url) {
    return `
      <p class="empty">No clickable SDS link is attached to this record.</p>
      ${reference ? `<p class="meta">PDF reference: ${escapeHtml(reference)}</p>` : ""}
    `;
  }
  return `
    <p class="meta">Open the linked SDS for the controlling product safety document.</p>
    <a class="button primary" href="${escapeHtml(record.sds_url)}" target="_blank" rel="noreferrer">Open official SDS</a>
    ${reference ? `<p class="meta">PDF reference: ${escapeHtml(reference)}</p>` : ""}
  `;
}

function nfpaDiamond(record) {
  const hfrp = parseHfrp(record);
  return `
    <div class="nfpa-card panel">
      <h2>HFRP / NFPA-style</h2>
      <div class="nfpa-diamond" aria-label="Hazard rating diamond">
        <div class="nfpa-cell nfpa-health"><span>${hfrp.health}</span></div>
        <div class="nfpa-cell nfpa-fire"><span>${hfrp.fire}</span></div>
        <div class="nfpa-cell nfpa-reactivity"><span>${hfrp.reactivity}</span></div>
        <div class="nfpa-cell nfpa-special"><span>${escapeHtml(hfrp.special || "—")}</span></div>
      </div>
      <p class="meta">Health / fire / reactivity / special: ${escapeHtml(hfrp.raw || "Not listed")}</p>
    </div>
  `;
}

function renderRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    renderNotFound(currentQuery);
    return;
  }

  const detailMeta = [record.company, cleanValue(record.product_code) ? `Code ${record.product_code}` : "", record.use].filter(Boolean).join(" | ");
  const risk = riskInfo(record);
  const details = [
    ["Company", record.company],
    ["Product code", record.product_code],
    ["Use", record.use],
    ["SDS number", record.sds_number],
    ["SDS version", record.sds_version],
    ["Issue date", record.issue_date],
    ["Revision date", record.revision_date],
    ["Supersedes date", record.supersedes_date],
    ["HFRP info", record.hfrp_info]
  ];

  layout(`
    <section class="detail-header">
      <div class="detail-main">
        <span class="eyebrow">SDS record</span>
        <h1 class="detail-title">${escapeHtml(record.name)}</h1>
        <p class="detail-meta">${escapeHtml(detailMeta || "SDS record")}</p>
        <div class="card-badges">
          <span class="risk-pill ${risk.className}">${risk.label} priority</span>
          ${ghsLabels(record).map((label) => `<span class="ghs-pill">${escapeHtml(label)}</span>`).join("")}
        </div>
        <p class="meta">Updated ${escapeHtml(formatDate(record.updated_at))}</p>
      </div>
      <div class="detail-actions">
        ${record.sds_url ? `<a class="button primary" href="${escapeHtml(record.sds_url)}" target="_blank" rel="noreferrer">Open SDS</a>` : ""}
        <button class="button secondary" data-route="add-chemical">Suggest update</button>
        <button class="button secondary" onclick="window.print()">Print</button>
      </div>
    </section>
    <div class="hazard-overview">
      ${nfpaDiamond(record)}
      <section class="panel">
        <h2>Quick Safety Summary</h2>
        <p><strong>Primary tags:</strong> ${ghsLabels(record).map(escapeHtml).join(", ")}</p>
        <p><strong>Composition:</strong> ${escapeHtml(cleanValue(record.composition) || "See SDS for composition details.")}</p>
        <p class="meta">Use the linked SDS for exact PPE, handling, storage, exposure controls, disposal, and emergency procedures.</p>
      </section>
    </div>
    <div class="sds-section-grid">
      <section class="panel"><h2>Section 1: Identification</h2>${summaryRows(details)}</section>
      <section class="panel"><h2>Section 2: Hazard Identification</h2><p>Priority: <strong>${risk.label}</strong>. Tags: ${ghsLabels(record).map(escapeHtml).join(", ")}.</p></section>
      <section class="panel"><h2>Section 3: Composition</h2><p>${escapeHtml(cleanValue(record.composition) || "See SDS for composition details.")}</p></section>
      <section class="panel"><h2>Section 4: First-Aid Reference</h2><p>Use the current SDS and emergency instructions for route-specific first aid. For serious or unknown exposures, contact emergency services or Poison Control.</p></section>
      <section class="panel"><h2>Section 5-7: Fire, Spill, Handling, Storage</h2><p>Consult the official SDS for fire response, accidental release measures, handling, storage, and incompatibilities.</p></section>
      <section class="panel"><h2>Section 8: Exposure Controls / PPE</h2><p>Consult the official SDS and your site procedures for required PPE and engineering controls.</p></section>
      <section class="panel"><h2>SDS Reference</h2>${sdsPanel(record)}</section>
      <section class="panel"><h2>Update Workflow</h2><p>Found an incorrect or incomplete record? Submit a missing-chemical request with the product label, SDS URL, supplier, and notes.</p><button class="button secondary" data-route="add-chemical">Suggest update</button></section>
    </div>
  `, { pageClass: "detail-page" });
}

function renderNotFound(query = "") {
  layout(`
    <section class="panel not-found-page">
      <div class="section-heading">
        <div>
          <span class="eyebrow">Not in library</span>
          <h1>No SDS record found</h1>
          <p class="lead">Request a new record and include an SDS link or manufacturer details if you have them.</p>
        </div>
      </div>
      <div class="form-actions">
        <button class="button primary" data-route="add-chemical">Add chemical request</button>
        <button class="button secondary" data-route="home">Back to search</button>
      </div>
    </section>
    <section class="panel">
      <h2>Reference Note</h2>
      <p class="meta">If this lookup relates to an active exposure, use the current SDS and your site response procedure.</p>
    </section>
  `);
}

function buildReviewEmail(request) {
  const approveUrl = `${REVIEW_ACTION_BASE_URL}?request=${encodeURIComponent(request.id)}&action=approve`;
  const rejectUrl = `${REVIEW_ACTION_BASE_URL}?request=${encodeURIComponent(request.id)}&action=reject`;
  const subject = `Chemical library request: ${request.chemical_name || "New chemical"}`;
  const body = [
    "A new chemical or SDS update was requested for the internal SDS library.",
    "",
    `Request ID: ${request.id}`,
    `Chemical name: ${request.chemical_name || "Not provided"}`,
    `Formula: ${request.formula || "Not provided"}`,
    `CAS number: ${request.cas_number || "Not provided"}`,
    `Manufacturer / supplier: ${request.manufacturer || "Not provided"}`,
    `SDS URL: ${request.sds_url || "Not provided"}`,
    `Requested by: ${request.requested_by || "Not provided"}`,
    `Exposure route: ${request.exposure_route || "Not provided"}`,
    "",
    "Reviewer notes:",
    request.notes || "None provided",
    "",
    "Approval actions for production backend:",
    `Approve: ${approveUrl}`,
    `Reject: ${rejectUrl}`,
    "",
    "Static prototype note: these links are placeholders until connected to a backend approval endpoint."
  ].join("\n");

  return `mailto:${REVIEW_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function renderAddChemical(prefill = currentQuery) {
  layout(`
    <section class="panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">Request review</span>
          <h1>Add or Update Chemical</h1>
          <p class="lead">Submit a chemical, product code, exposure concern, or SDS reference for reviewer approval.</p>
        </div>
      </div>
      <div class="banner info">
        <strong>Email approval workflow</strong>
        This prototype opens a prefilled email to ${escapeHtml(REVIEW_EMAIL)}. A production version should connect this form to a secure backend approval endpoint.
      </div>
      <form id="addChemicalForm" class="form-grid">
        <label class="label">Chemical or product name <input class="field" name="chemical_name" value="${escapeHtml(prefill || "")}" required /></label>
        <label class="label">Formula <input class="field" name="formula" placeholder="Optional" /></label>
        <label class="label">CAS number <input class="field" name="cas_number" placeholder="Optional" /></label>
        <label class="label">Manufacturer / supplier <input class="field" name="manufacturer" placeholder="Optional but useful for SDS matching" /></label>
        <label class="label">SDS link <input class="field" name="sds_url" placeholder="Paste manufacturer SDS URL or internal document link" /></label>
        <label class="label">Exposure route, if incident-related
          <select class="field" name="exposure_route">
            <option value="">Not incident-related / unknown</option>
            <option>Skin</option>
            <option>Eyes</option>
            <option>Inhalation</option>
            <option>Ingestion</option>
          </select>
        </label>
        <label class="label">Your email <input class="field" name="requested_by" type="email" placeholder="name@example.com" /></label>
        <label class="label">Notes <span>Location, product code, concentration, label warnings, symptoms, or reason for adding</span><textarea class="textarea" name="notes"></textarea></label>
        <div class="form-actions">
          <button class="button primary" type="submit">Create review email</button>
          <button class="button secondary" type="button" data-route="home">Cancel</button>
        </div>
      </form>
    </section>
  `);

  document.getElementById("addChemicalForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const request = {
      id: makeId("add"),
      chemical_name: form.get("chemical_name").trim(),
      formula: form.get("formula").trim(),
      cas_number: form.get("cas_number").trim(),
      manufacturer: form.get("manufacturer").trim(),
      sds_url: form.get("sds_url").trim(),
      exposure_route: form.get("exposure_route").trim(),
      requested_by: form.get("requested_by").trim(),
      notes: form.get("notes").trim(),
      review_email: REVIEW_EMAIL,
      created_at: new Date().toISOString()
    };
    request.mailto = buildReviewEmail(request);
    const requests = loadRequests();
    requests.push(request);
    saveRequests(requests);
    location.hash = `#/request/${request.id}`;
    window.setTimeout(() => {
      window.location.href = request.mailto;
    }, 100);
  });
}

function renderRequestReceipt(id) {
  const request = loadRequests().find((item) => item.id === id);
  if (!request) {
    renderAddChemical();
    return;
  }

  layout(`
    <section class="panel receipt">
      <div class="banner info">
        <strong>Email request ready</strong>
        A prefilled email draft should open in your mail app. If it does not, use the button below.
      </div>
      <h1>Add Chemical Request</h1>
      ${summaryRows([
        ["Chemical", request.chemical_name],
        ["Formula", request.formula],
        ["CAS", request.cas_number],
        ["Manufacturer", request.manufacturer],
        ["Exposure route", request.exposure_route],
        ["Reviewer email", request.review_email],
        ["Created", formatDate(request.created_at)]
      ])}
      <p class="meta">SDS: ${request.sds_url ? `<a href="${escapeHtml(request.sds_url)}" target="_blank" rel="noreferrer">${escapeHtml(request.sds_url)}</a>` : "Not provided"}</p>
      <div class="form-actions">
        <a class="button primary" href="${escapeHtml(request.mailto)}">Open review email</a>
        <button class="button secondary" data-route="home">Back to search</button>
      </div>
    </section>
  `);
}

function route() {
  const [page, id] = location.hash.replace(/^#\/?/, "").split("/");
  if (!page) renderHome();
  else if (page === "chemical") renderRecord(id);
  else if (page === "add-chemical") renderAddChemical();
  else if (page === "request") renderRequestReceipt(id);
  else if (page === "not-found") renderNotFound(currentQuery);
  else renderHome();
}

injectEnhancementStyles();
window.addEventListener("hashchange", route);
route();
