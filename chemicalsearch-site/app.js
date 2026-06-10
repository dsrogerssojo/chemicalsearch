const REVIEW_EMAIL = "safety-review@example.com";
const REQUEST_KEY = "chemicalSdsLookup.requests.v1";

const records = Array.isArray(globalThis.SDS_RECORDS)
  ? [...globalThis.SDS_RECORDS].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
  : [];

let currentQuery = "";
let currentFilter = "all";
let currentSort = "name";
window.currentQuery = currentQuery;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanValue(value) {
  const text = String(value || "").trim();
  return !text || text.toLowerCase() === "n/a" ? "" : text;
}

function normalize(value) {
  return cleanValue(value).toLowerCase();
}

function displayValue(value) {
  return escapeHtml(cleanValue(value) || "Not listed");
}

function setCurrentQuery(value) {
  currentQuery = String(value || "");
  window.currentQuery = currentQuery;
}

function formatDate(value) {
  const text = cleanValue(value);
  if (!text) return "Not listed";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function sourceInfo(record) {
  const approved = cleanValue(record.approved_at) || cleanValue(record.approved_by);
  return approved
    ? { label: "Supervisor approved", className: "source-approved", detail: cleanValue(record.approved_by) || "Reviewed record" }
    : { label: "Built-in library", className: "source-built-in", detail: "Seed SDS record" };
}

function sdsStatus(record) {
  return cleanValue(record.sds_url)
    ? { label: "SDS linked", className: "sds-linked" }
    : { label: "SDS missing", className: "sds-missing" };
}

function loadRequests() {
  try {
    const stored = JSON.parse(localStorage.getItem(REQUEST_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveRequests(requests) {
  localStorage.setItem(REQUEST_KEY, JSON.stringify(requests));
}

function makeId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `request-${Date.now()}`;
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
  if (/acid|corrosive|muriatic|toilet bowl/.test(text)) tags.push("corrosive");
  if (/alcohol|aerosol|propane|butane|solvent|lubricant|flammable|fuel/.test(text)) tags.push("flammable");
  if (/cleaner|detergent|fragrance|freshener|irritant/.test(text)) tags.push("irritant");
  if (!tags.length) tags.push("general");
  return [...new Set(tags)];
}

function ghsLabels(record) {
  const labels = { oxidizer: "Oxidizer", corrosive: "Corrosive", flammable: "Flammable", irritant: "Irritant", general: "SDS" };
  return inferTags(record).map((tag) => ({ tag, label: labels[tag] || tag }));
}

function searchableValues(record) {
  return [
    record.name,
    record.company,
    record.product_code,
    record.cas_number,
    record.approved_by,
    record.use,
    record.sds_number,
    record.sds_version,
    record.composition,
    record.hfrp_info,
    record.sds_url,
    ...inferTags(record),
    ...ghsLabels(record).map((item) => item.label)
  ];
}

function searchScore(record) {
  const q = normalize(currentQuery);
  if (!q) return sourceInfo(record).className === "source-approved" ? -1 : 0;
  const exactFields = [record.product_code, record.cas_number, record.sds_number, record.name].map(normalize);
  if (exactFields.some((value) => value === q)) return 0;
  if (normalize(record.name).startsWith(q)) return 1;
  if (normalize(record.product_code).startsWith(q) || normalize(record.cas_number).startsWith(q)) return 2;
  if (normalize(record.company).includes(q)) return 3;
  if (sourceInfo(record).className === "source-approved") return 4;
  return 5;
}

function matchesRecord(record) {
  const q = normalize(currentQuery);
  const matchesQuery = !q || searchableValues(record).some((value) => normalize(value).includes(q));
  const matchesFilter = currentFilter === "all" || inferTags(record).includes(currentFilter) || riskInfo(record).label.toLowerCase() === currentFilter;
  return matchesQuery && matchesFilter;
}

function searchResults() {
  const results = records.filter(matchesRecord);
  return results.sort((a, b) => {
    if (currentSort === "risk") return riskInfo(b).rank - riskInfo(a).rank || String(a.name || "").localeCompare(String(b.name || ""));
    if (currentSort === "updated") return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    return searchScore(a) - searchScore(b) || String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function injectStyles() {
  // Base app styles now live in app-base.css.
  // Keep this no-op shim so existing startup flow remains unchanged.
}

function layout(content, options = {}) {
  document.getElementById("app").innerHTML = `
    <div class="shell ${escapeHtml(options.pageClass || "")}">
      <header class="topbar">
        <div class="topbar-inner">
          <button class="brand" data-route="home" aria-label="Go to search">
            <span class="brand-mark">CS</span>
            <span class="brand-copy"><span class="brand-title">ChemicalSearch</span><span class="brand-subtitle">SDS safety lookup portal</span></span>
          </button>
          <nav class="nav-actions"><button class="button secondary compact" data-route="home">Search</button><button class="button primary compact" data-route="add-chemical">Missing chemical</button></nav>
        </div>
      </header>
      <section class="emergency-strip">
        <div class="emergency-strip-inner">
          <a class="hotline critical" href="tel:911"><span><span class="hotline-label">Emergency</span><br><span class="hotline-copy">Call 911 for serious exposure</span></span><strong>911</strong></a>
          <a class="hotline poison" href="tel:18002221222"><span><span class="hotline-label">Poison Control</span><br><span class="hotline-copy">United States hotline</span></span><strong>1-800-222-1222</strong></a>
          <button class="hotline neutral" data-route="add-chemical" type="button"><span><span class="hotline-label">Unknown product</span><br><span class="hotline-copy">Capture label details</span></span><strong>Intake</strong></button>
        </div>
      </section>
      ${options.showHero ? hero() : ""}
      <main class="main">${content}</main>
      <footer class="footer"><div class="footer-inner">Internal reference only. Confirm procedures against the current SDS, product label, and your site requirements.</div></footer>
    </div>
  `;
  bindButtons();
}

function hero() {
  return `
    <section class="hero">
      <div class="hero-inner">
        <span class="eyebrow">SDS-inspired chemical safety reference</span>
        <h1>Search chemical products and safety records.</h1>
        <p class="lead">Fast lookup for SDS links, product details, hazard indicators, and missing-chemical requests.</p>
        <div class="trust-row"><span>${records.length} records</span><span>HFRP ratings</span><span>SDS links</span><span>Review workflow</span></div>
      </div>
    </section>
  `;
}

function searchPanel() {
  return `
    <div class="search-panel panel">
      <form id="searchForm" class="search-row" role="search">
        <label class="sr-only" for="searchInput">Search SDS records</label>
        <input id="searchInput" class="search-input" value="${escapeHtml(currentQuery)}" placeholder="Search cleaner, bleach, company, product code, composition..." autocomplete="off" />
        <button class="button primary" type="submit">Search</button>
      </form>
      <div class="quick-searches">${["Cleaner", "Bleach", "Lubricant", "Corrosive", "Flammable"].map((query) => `<button class="quick-chip" data-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join("")}</div>
    </div>
  `;
}

function renderHome() {
  layout(`
    <section class="panel results-panel">
      ${searchPanel()}
      <div class="section-heading">
        <div><span class="eyebrow">Safety library</span><h2 id="resultsTitle">Chemical Records</h2><p id="resultsMeta" class="meta"></p></div>
      </div>
      <div class="filter-toolbar">
        <div class="filter-tabs">${[["all", "All"], ["high", "High risk"], ["flammable", "Flammable"], ["corrosive", "Corrosive"], ["oxidizer", "Oxidizer"], ["irritant", "Irritant"]].map(([value, label]) => `<button class="filter-chip ${currentFilter === value ? "is-selected" : ""}" data-filter="${value}" type="button">${label}</button>`).join("")}</div>
        <label class="sort-control">Sort <select id="sortSelect"><option value="name" ${currentSort === "name" ? "selected" : ""}>Name</option><option value="risk" ${currentSort === "risk" ? "selected" : ""}>Risk level</option><option value="updated" ${currentSort === "updated" ? "selected" : ""}>Recently updated</option></select></label>
      </div>
      <div id="resultsList" class="cards" aria-live="polite"></div>
    </section>
    <section class="panel"><div class="section-heading"><div><span class="eyebrow danger-text">Exposure workflow</span><h2>Fast response checklist</h2><p class="meta">Use this only as a routing aid. The current SDS and emergency instructions control.</p></div></div><div class="incident-grid">${incidentCard("Skin", "Remove contaminated clothing and rinse affected area.")}${incidentCard("Eyes", "Begin eyewash immediately and seek urgent help.")}${incidentCard("Inhalation", "Move to fresh air if safe and monitor breathing.")}${incidentCard("Ingestion", "Do not induce vomiting unless directed.")}</div></section>
  `, { showHero: true });

  bindSearchControls();
  renderResults();
}

function bindSearchControls() {
  document.getElementById("searchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    setCurrentQuery(document.getElementById("searchInput").value.trim());
    renderResults();
  });
  document.getElementById("searchInput")?.addEventListener("input", (event) => {
    setCurrentQuery(event.target.value);
    renderResults();
  });
  document.querySelectorAll("[data-query]").forEach((button) => {
    button.addEventListener("click", () => {
      setCurrentQuery(button.dataset.query);
      document.getElementById("searchInput").value = currentQuery;
      renderResults();
    });
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      renderHome();
    });
  });
  document.getElementById("sortSelect")?.addEventListener("change", (event) => {
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
  bindButtons(list);
}

function recordCard(record) {
  const subline = [record.company, cleanValue(record.product_code) ? `Code ${record.product_code}` : ""].filter(Boolean).join(" | ");
  const risk = riskInfo(record);
  const hfrp = parseHfrp(record);
  const source = sourceInfo(record);
  const sds = sdsStatus(record);
  const labels = ghsLabels(record).map((item) => `<span class="ghs-pill ghs-${escapeHtml(item.tag)}">${escapeHtml(item.label)}</span>`).join("");
  return `
    <button class="chemical-card hazard-${risk.label.toLowerCase()}" data-chemical-id="${escapeHtml(record.id)}">
      <span class="hazard-rail"></span>
      <span class="card-content">
        <strong class="chemical-name">${escapeHtml(record.name)}</strong>
        <span class="meta">${escapeHtml(subline || "Product details")}</span>
        <span class="card-badges"><span class="risk-pill ${risk.className}">${risk.label}</span>${labels}${hfrp.raw ? `<span class="ghs-pill">HFRP ${escapeHtml(hfrp.raw)}</span>` : ""}</span>
        <span class="record-status-row"><span class="source-pill ${source.className}">${escapeHtml(source.label)}</span><span class="source-pill ${sds.className}">${escapeHtml(sds.label)}</span></span>
        <span class="card-preview"><span><strong>Use:</strong> ${displayValue(record.use)}</span><span><strong>Composition:</strong> ${displayValue(record.composition)}</span></span>
        <span class="card-footer"><span>Updated ${escapeHtml(formatDate(record.updated_at))}</span><span class="open-label">Open SDS record</span></span>
      </span>
    </button>
  `;
}

function notFoundPrompt(query) {
  return `<div class="not-found-block"><div class="banner"><strong>No SDS record found</strong><br>No record matched "${escapeHtml(query || "your search")}".</div><button class="button primary" data-route="add-chemical">Request this chemical</button></div>`;
}

function summaryRows(rows) {
  return `<dl class="summary-list">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${displayValue(value)}</dd></div>`).join("")}</dl>`;
}

function sdsPanel(record) {
  if (!record.sds_url) return `<p class="empty">No SDS link is attached to this record.</p>`;
  return `<p class="meta">Open the current safety document for full handling, PPE, storage, exposure, and disposal guidance.</p><a class="button primary" href="${escapeHtml(record.sds_url)}" target="_blank" rel="noreferrer">Open official SDS</a>`;
}

function nfpaDiamond(record) {
  const hfrp = parseHfrp(record);
  return `<div class="nfpa-card panel"><h2>HFRP / NFPA-style</h2><div class="nfpa-diamond"><div class="nfpa-cell nfpa-health"><span>${hfrp.health}</span></div><div class="nfpa-cell nfpa-fire"><span>${hfrp.fire}</span></div><div class="nfpa-cell nfpa-reactivity"><span>${hfrp.reactivity}</span></div><div class="nfpa-cell nfpa-special"><span>${escapeHtml(hfrp.special || "—")}</span></div></div><p class="meta">Health / fire / reactivity / special: ${escapeHtml(hfrp.raw || "Not listed")}</p></div>`;
}

function renderRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return renderHome();
  const risk = riskInfo(record);
  const source = sourceInfo(record);
  const sds = sdsStatus(record);
  const labels = ghsLabels(record).map((item) => `<span class="ghs-pill ghs-${escapeHtml(item.tag)}">${escapeHtml(item.label)}</span>`).join("");
  const details = [["Company", record.company], ["Product code", record.product_code], ["Use", record.use], ["SDS number", record.sds_number], ["SDS version", record.sds_version], ["Issue date", record.issue_date], ["Revision date", record.revision_date], ["HFRP info", record.hfrp_info], ["Source", source.label], ["SDS status", sds.label], ["Approved by", record.approved_by], ["Approved at", formatDate(record.approved_at)], ["Updated", formatDate(record.updated_at)]];
  layout(`
    <section class="panel detail-search-panel">
      <form id="detailSearchForm" class="search-row" role="search">
        <label class="sr-only" for="detailSearchInput">Search another SDS record</label>
        <input id="detailSearchInput" class="search-input" value="${escapeHtml(currentQuery)}" placeholder="Search another product, code, company, or CAS..." autocomplete="off" />
        <button class="button primary" type="submit">Search</button>
      </form>
    </section>
    <section class="detail-header panel"><div><span class="eyebrow">SDS record</span><h1 class="detail-title">${escapeHtml(record.name)}</h1><p class="detail-meta">${escapeHtml([record.company, cleanValue(record.product_code) ? `Code ${record.product_code}` : "", record.use].filter(Boolean).join(" | "))}</p><div class="card-badges"><span class="risk-pill ${risk.className}">${risk.label}</span>${labels}</div></div><div class="detail-actions">${record.sds_url ? `<a class="button primary" href="${escapeHtml(record.sds_url)}" target="_blank" rel="noreferrer">Open SDS</a>` : ""}<button class="button secondary" data-route="add-chemical">Suggest update</button><button class="button secondary" onclick="window.print()">Print</button></div></section>
    <div class="hazard-overview">${nfpaDiamond(record)}<section class="panel"><h2>Quick Safety Summary</h2><p><strong>Primary tags:</strong> ${ghsLabels(record).map((item) => escapeHtml(item.label)).join(", ")}</p><p><strong>Composition:</strong> ${displayValue(record.composition)}</p><p><strong>Record source:</strong> ${escapeHtml(source.label)}. <strong>SDS status:</strong> ${escapeHtml(sds.label)}.</p><p class="meta">Use the linked SDS for exact PPE, handling, storage, exposure controls, disposal, and emergency procedures.</p></section></div>
    <div class="sds-section-grid"><section class="panel"><h2>Identification</h2>${summaryRows(details)}</section><section class="panel"><h2>Hazard Identification</h2><p>Priority: <strong>${risk.label}</strong>. Tags: ${ghsLabels(record).map((item) => escapeHtml(item.label)).join(", ")}.</p></section><section class="panel"><h2>Composition</h2><p>${displayValue(record.composition)}</p></section><section class="panel"><h2>First-Aid Reference</h2><p>Use the current SDS and emergency instructions for route-specific first aid.</p></section><section class="panel"><h2>Handling / Storage</h2><p>Consult the official SDS for handling, storage, incompatibilities, and disposal.</p></section><section class="panel"><h2>SDS Link</h2>${sdsPanel(record)}</section></div>
  `, { pageClass: "detail-page" });
  document.getElementById("detailSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    setCurrentQuery(document.getElementById("detailSearchInput").value.trim());
    location.hash = "#/";
  });
}

function renderAddChemical(prefill = currentQuery) {
  layout(`<section class="panel"><div class="section-heading"><div><span class="eyebrow">Supervisor review</span><h1>Add or Update Chemical</h1><p class="lead">Enter the information you know from the label, SDS, supplier page, or product container. The request is sent to a supervisor for review and approval before it appears in ChemicalSearch.</p></div></div><div id="requestStatus" class="banner request-status"><strong>Put in whatever you know.</strong><br><span>Partial details are okay. A supervisor will verify the SDS information and approve the record before it is added to the searchable library.</span></div><form id="addChemicalForm" class="form-grid"><label class="label">Chemical or product name <input class="field" name="chemical_name" value="${escapeHtml(prefill || "")}"></label><label class="label">Product code <input class="field" name="product_code"></label><label class="label">CAS number <input class="field" name="cas_number"></label><label class="label">Manufacturer / supplier <input class="field" name="manufacturer"></label><label class="label">SDS link <input class="field" name="sds_url"></label><label class="label">Composition / active ingredient <input class="field" name="composition"></label><label class="label">Exposure route <select class="field" name="exposure_route"><option value="">Not incident-related / unknown</option><option>Skin</option><option>Eyes</option><option>Inhalation</option><option>Ingestion</option></select></label><label class="label">Your email <input class="field" name="requested_by" type="email"></label><label class="label label-full">Notes <textarea class="textarea" name="notes" placeholder="Location, label details, why it is needed, or anything the reviewer should verify"></textarea></label><div class="form-actions label-full"><button class="button primary" type="submit">Save request receipt</button><button class="button secondary" type="button" data-route="home">Cancel</button></div></form></section>`);
  const form = document.getElementById("addChemicalForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const request = Object.fromEntries(data.entries());
    request.id = makeId();
    request.created_at = new Date().toISOString();
    const requests = loadRequests();
    requests.push(request);
    saveRequests(requests);
    location.hash = `#/request/${request.id}`;
  });
}

function renderRequestReceipt(id) {
  const request = loadRequests().find((item) => item.id === id || item.request_id === id);
  if (!request) return renderAddChemical();
  const delivery = cleanValue(request.delivery_status || request.status);
  const statusLabel = delivery === "sent_to_teams" ? "Sent to Teams review" : delivery === "local_only" ? "Saved locally, not sent" : delivery === "saved_without_teams" ? "Saved without Teams queue" : "Saved";
  layout(`<section class="panel receipt"><span class="eyebrow">Request receipt</span><h1>Add Chemical Request</h1><div class="banner ${delivery === "local_only" ? "request-status is-error" : "request-status is-success"}"><strong>${escapeHtml(statusLabel)}</strong><br><span>${escapeHtml(request.submit_message || "Keep this page as a local receipt for the request.")}</span></div>${summaryRows([["Request ID", request.request_id || request.id], ["Chemical", request.chemical_name], ["Product code", request.product_code], ["CAS", request.cas_number], ["Manufacturer", request.manufacturer], ["SDS link", request.sds_url], ["Created", formatDate(request.created_at)]])}<button class="button secondary" data-route="home">Back to search</button></section>`);
}

function bindButtons(scope = document) {
  scope.querySelectorAll("[data-route]:not([data-bound])").forEach((button) => {
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      if (button.dataset.route === "home") location.hash = "#/";
      if (button.dataset.route === "add-chemical") location.hash = "#/add-chemical";
    });
  });
  scope.querySelectorAll("[data-chemical-id]:not([data-bound])").forEach((button) => {
    button.dataset.bound = "true";
    button.addEventListener("click", () => location.hash = `#/chemical/${button.dataset.chemicalId}`);
  });
}

function route() {
  const [page, id] = location.hash.replace(/^#\/?/, "").split("/");
  if (!page) renderHome();
  else if (page === "chemical") renderRecord(id);
  else if (page === "add-chemical") renderAddChemical();
  else if (page === "request") renderRequestReceipt(id);
  else renderHome();
}

injectStyles();
window.addEventListener("hashchange", route);
route();
