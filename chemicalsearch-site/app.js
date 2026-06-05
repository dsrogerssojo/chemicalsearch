const REVIEW_EMAIL = "safety-review@example.com";
const REQUEST_KEY = "chemicalSdsLookup.requests.v1";

const records = Array.isArray(globalThis.SDS_RECORDS)
  ? [...globalThis.SDS_RECORDS].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
  : [];

let currentQuery = "";
let currentFilter = "all";
let currentSort = "name";

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
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function injectStyles() {
  if (document.getElementById("chemicalsearch-direct-styles")) return;
  const style = document.createElement("style");
  style.id = "chemicalsearch-direct-styles";
  style.textContent = `
    :root{--bg:#070707;--panel:#ffffff;--panel2:#f6f6f6;--ink:#111111;--muted:#5f6368;--line:#d8d8d8;--line2:#c4c4c4;--white:#fff;--black:#000;--shadow:0 16px 38px rgba(0,0,0,.18)}*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,Helvetica,sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}a{color:#111}.shell{min-height:100vh;background:#070707}.topbar{position:sticky;top:0;z-index:20;background:#000;color:#fff;border-bottom:1px solid #222}.topbar-inner,.emergency-strip-inner,.hero-inner,.main,.footer-inner{width:100%;max-width:1120px;margin:0 auto}.topbar-inner{min-height:60px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{display:flex;align-items:center;gap:10px;border:0;background:transparent;color:#fff;text-align:left}.brand-mark{width:38px;height:38px;border-radius:9px;background:#fff;color:#000;display:grid;place-items:center;font-weight:900}.brand-copy{display:grid}.brand-title{font-weight:900}.brand-subtitle{font-size:.8rem;color:#bdbdbd}.nav-actions,.form-actions,.quick-searches,.filter-tabs,.card-badges,.detail-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.button{min-height:40px;border:1px solid #111;border-radius:10px;padding:0 13px;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;background:#fff;color:#111}.button.primary{background:#000;color:#fff;border-color:#000}.button.secondary{background:#fff;border-color:#9a9a9a;color:#111}.button.compact{min-height:34px;font-size:.9rem}.button:hover,.quick-chip:hover,.filter-chip:hover{transform:translateY(-1px)}.emergency-strip{background:#111;border-bottom:1px solid #222}.emergency-strip-inner{padding:8px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.hotline{min-height:42px;border-radius:9px;padding:8px 10px;text-decoration:none;color:#111;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #d8d8d8;text-align:left;background:#fff}.hotline.critical{background:#fff;color:#000;border-color:#fff}.hotline.poison,.hotline.neutral{background:#efefef;color:#111}.hotline-label{font-weight:900}.hotline-copy{font-size:.76rem;opacity:.78}.hero{background:#000;color:#fff;border-bottom:1px solid #222}.hero-inner{padding:16px}.eyebrow{display:inline-flex;align-items:center;min-height:22px;padding:0 9px;border-radius:999px;background:#111;color:#fff;font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.hero .eyebrow{background:#fff;color:#000}.hero h1{max-width:780px;margin:8px 0;font-size:clamp(1.45rem,2.6vw,2.25rem);line-height:1.07;color:#fff}.lead{color:var(--muted);line-height:1.4}.hero .lead{max-width:820px;color:#d7d7d7;margin:0}.trust-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.trust-row span{background:#151515;color:#fff;border:1px solid #333;border-radius:999px;padding:4px 9px;font-size:.78rem}.main{padding:14px 16px 28px;display:grid;gap:14px}.panel{background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:16px}.search-panel{box-shadow:none;background:#f7f7f7;margin-bottom:14px}.search-row{display:grid;grid-template-columns:1fr auto;gap:10px}.search-input,.field,.textarea{width:100%;min-height:44px;border:1px solid #b8b8b8;border-radius:10px;padding:10px 12px;background:#fff;color:#111}.search-input::placeholder,.field::placeholder,.textarea::placeholder{color:#777}.search-input:focus,.field:focus,.textarea:focus,select:focus{outline:2px solid #000;outline-offset:1px}.textarea{min-height:100px;resize:vertical}.quick-searches{margin-top:8px}.quick-chip,.filter-chip{min-height:34px;border:1px solid #b8b8b8;border-radius:999px;background:#fff;color:#111;padding:0 12px;font-weight:800}.filter-chip.is-selected,.quick-chip:hover{background:#000;color:#fff;border-color:#000}.section-heading,.filter-toolbar,.detail-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.filter-toolbar{margin-bottom:12px}.sort-control{display:flex;align-items:center;gap:8px;color:var(--muted)}.sort-control select{min-height:36px;border:1px solid #b8b8b8;border-radius:999px;padding:0 12px;background:#fff;color:#111}.meta{color:var(--muted);font-size:.92rem;line-height:1.35}.cards{display:grid;gap:10px}.chemical-card{width:100%;border:1px solid var(--line);border-radius:12px;background:#fff;color:#111;text-align:left;display:grid;grid-template-columns:8px 1fr;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.08)}.chemical-card:hover{border-color:#111;box-shadow:0 10px 24px rgba(0,0,0,.14)}.hazard-rail{background:#1f7a4d}.hazard-high .hazard-rail,.hazard-extreme .hazard-rail{background:#b42318}.hazard-moderate .hazard-rail{background:#b7791f}.card-content{padding:14px;display:block}.chemical-name{font-size:1.02rem;color:#111}.risk-pill,.ghs-pill{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:.72rem;font-weight:900;border:1px solid transparent}.risk-low{background:#eaf7ef;color:#28784a;border-color:#bde5cb}.risk-moderate{background:#fff7da;color:#9a6500;border-color:#f1d77a}.risk-high,.risk-extreme{background:#fff0ed;color:#b42318;border-color:#f2b8b0}.ghs-pill{background:#eeeeee;color:#111;border-color:#d0d0d0}.ghs-flammable{background:#fff0e6;color:#b45309;border-color:#f0c18b}.ghs-corrosive{background:#f4e8ff;color:#6b21a8;border-color:#d7b7f5}.ghs-oxidizer{background:#e9fbf4;color:#047857;border-color:#a7e6cc}.ghs-irritant{background:#fff7d6;color:#92400e;border-color:#ecd16f}.ghs-general{background:#eaf4ff;color:#0d4d7d;border-color:#b8d7f2}.card-preview{display:grid;gap:3px;color:#333;line-height:1.35}.card-footer{margin-top:8px;display:flex;justify-content:space-between;color:var(--muted);font-size:.86rem}.open-label{color:#000;font-weight:900}.incident-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.incident-card{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff}.incident-card h3,.panel h2{color:#111}.detail-header{background:#fff;padding:16px;align-items:center}.detail-title{font-size:clamp(1.55rem,2.4vw,2.25rem);margin:8px 0 6px;color:#111}.detail-meta{font-size:.95rem;color:#333}.hazard-overview{display:grid;grid-template-columns:190px 1fr;gap:12px}.nfpa-card{display:grid;place-items:center}.nfpa-diamond{width:124px;height:124px;position:relative;transform:rotate(45deg);margin:8px}.nfpa-cell{position:absolute;width:60px;height:60px;display:grid;place-items:center;border:2px solid #fff;font-weight:900;font-size:1rem;color:#fff}.nfpa-cell span{transform:rotate(-45deg)}.nfpa-health{left:0;top:32px;background:#2563eb}.nfpa-fire{left:32px;top:0;background:#dc2626}.nfpa-reactivity{right:0;top:32px;background:#f59e0b;color:#111}.nfpa-special{left:32px;bottom:0;background:#fff;color:#111;border-color:#111}.sds-section-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.panel h2{font-size:1.15rem;margin:0 0 8px}.panel p{line-height:1.45;color:#333}.summary-list{display:grid;gap:0;margin:0}.summary-list div{padding:8px 0;border-bottom:1px solid var(--line)}.summary-list dt{font-weight:900;color:#111}.summary-list dd{margin:3px 0 0;color:var(--muted)}.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.label{display:grid;gap:6px;font-weight:800;color:#111}.label span{color:var(--muted);font-weight:400}.label-full{grid-column:1/-1}.banner{background:#f5f5f5;border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0;color:#111}.footer{background:#000;border-top:1px solid #222}.footer-inner{padding:18px 16px;color:#bdbdbd;font-size:.9rem}@media(max-width:820px){.emergency-strip-inner,.search-row,.incident-grid,.hazard-overview,.sds-section-grid,.form-grid{grid-template-columns:1fr}.section-heading,.filter-toolbar,.detail-header{display:block}.detail-actions{margin-top:12px}.sort-control{margin-top:8px}.hero-inner{padding:14px 16px}.topbar-inner{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);
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
    currentQuery = document.getElementById("searchInput").value.trim();
    renderResults();
  });
  document.getElementById("searchInput")?.addEventListener("input", (event) => {
    currentQuery = event.target.value;
    renderResults();
  });
  document.querySelectorAll("[data-query]").forEach((button) => {
    button.addEventListener("click", () => {
      currentQuery = button.dataset.query;
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
  const labels = ghsLabels(record).map((item) => `<span class="ghs-pill ghs-${escapeHtml(item.tag)}">${escapeHtml(item.label)}</span>`).join("");
  return `
    <button class="chemical-card hazard-${risk.label.toLowerCase()}" data-chemical-id="${escapeHtml(record.id)}">
      <span class="hazard-rail"></span>
      <span class="card-content">
        <strong class="chemical-name">${escapeHtml(record.name)}</strong>
        <span class="meta">${escapeHtml(subline || "Product details")}</span>
        <span class="card-badges"><span class="risk-pill ${risk.className}">${risk.label}</span>${labels}${hfrp.raw ? `<span class="ghs-pill">HFRP ${escapeHtml(hfrp.raw)}</span>` : ""}</span>
        <span class="card-preview"><span><strong>Use:</strong> ${displayValue(record.use)}</span><span><strong>Composition:</strong> ${displayValue(record.composition)}</span></span>
        <span class="card-footer"><span>Updated ${displayValue(record.updated_at)}</span><span class="open-label">Open SDS record</span></span>
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
  const labels = ghsLabels(record).map((item) => `<span class="ghs-pill ghs-${escapeHtml(item.tag)}">${escapeHtml(item.label)}</span>`).join("");
  const details = [["Company", record.company], ["Product code", record.product_code], ["Use", record.use], ["SDS number", record.sds_number], ["SDS version", record.sds_version], ["Issue date", record.issue_date], ["Revision date", record.revision_date], ["HFRP info", record.hfrp_info]];
  layout(`
    <section class="detail-header panel"><div><span class="eyebrow">SDS record</span><h1 class="detail-title">${escapeHtml(record.name)}</h1><p class="detail-meta">${escapeHtml([record.company, cleanValue(record.product_code) ? `Code ${record.product_code}` : "", record.use].filter(Boolean).join(" | "))}</p><div class="card-badges"><span class="risk-pill ${risk.className}">${risk.label}</span>${labels}</div></div><div class="detail-actions">${record.sds_url ? `<a class="button primary" href="${escapeHtml(record.sds_url)}" target="_blank" rel="noreferrer">Open SDS</a>` : ""}<button class="button secondary" data-route="add-chemical">Suggest update</button><button class="button secondary" onclick="window.print()">Print</button></div></section>
    <div class="hazard-overview">${nfpaDiamond(record)}<section class="panel"><h2>Quick Safety Summary</h2><p><strong>Primary tags:</strong> ${ghsLabels(record).map((item) => escapeHtml(item.label)).join(", ")}</p><p><strong>Composition:</strong> ${displayValue(record.composition)}</p><p class="meta">Use the linked SDS for exact PPE, handling, storage, exposure controls, disposal, and emergency procedures.</p></section></div>
    <div class="sds-section-grid"><section class="panel"><h2>Identification</h2>${summaryRows(details)}</section><section class="panel"><h2>Hazard Identification</h2><p>Priority: <strong>${risk.label}</strong>. Tags: ${ghsLabels(record).map((item) => escapeHtml(item.label)).join(", ")}.</p></section><section class="panel"><h2>Composition</h2><p>${displayValue(record.composition)}</p></section><section class="panel"><h2>First-Aid Reference</h2><p>Use the current SDS and emergency instructions for route-specific first aid.</p></section><section class="panel"><h2>Handling / Storage</h2><p>Consult the official SDS for handling, storage, incompatibilities, and disposal.</p></section><section class="panel"><h2>SDS Link</h2>${sdsPanel(record)}</section></div>
  `, { pageClass: "detail-page" });
}

function findAutofillMatch(form) {
  const values = [form.chemical_name?.value, form.product_code?.value, form.cas_number?.value, form.manufacturer?.value, form.sds_url?.value, form.composition?.value].map(normalize).filter((value) => value.length >= 3);
  if (!values.length) return null;
  let best = null;
  let bestScore = 0;
  for (const record of records) {
    const haystack = searchableValues(record).map(normalize).join(" ");
    let score = 0;
    values.forEach((value) => {
      if (normalize(record.name) === value) score += 8;
      if (normalize(record.product_code) === value) score += 7;
      if (normalize(record.company) === value) score += 5;
      if (haystack.includes(value)) score += 3;
    });
    if (score > bestScore) {
      best = record;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : null;
}

function setIfEmpty(field, value) {
  if (field && !cleanValue(field.value) && cleanValue(value)) field.value = value;
}

function applyAutofill(form, status) {
  const match = findAutofillMatch(form.elements);
  if (!match) {
    status.textContent = "Start with any product name, code, supplier, composition, or SDS link. Matching fields auto-fill from the current library.";
    return;
  }
  setIfEmpty(form.elements.chemical_name, match.name);
  setIfEmpty(form.elements.product_code, match.product_code);
  setIfEmpty(form.elements.manufacturer, match.company);
  setIfEmpty(form.elements.sds_url, match.sds_url);
  setIfEmpty(form.elements.composition, match.composition);
  setIfEmpty(form.elements.notes, [cleanValue(match.use) ? `Use: ${match.use}` : "", cleanValue(match.hfrp_info) ? `HFRP: ${match.hfrp_info}` : "", cleanValue(match.sds_number) ? `SDS number: ${match.sds_number}` : ""].filter(Boolean).join("\n"));
  status.innerHTML = `<strong>Auto-filled:</strong> ${escapeHtml(match.name)}`;
}

function renderAddChemical(prefill = currentQuery) {
  layout(`<section class="panel"><div class="section-heading"><div><span class="eyebrow">Request review</span><h1>Add or Update Chemical</h1><p class="lead">Start with any field you know. Matching fields fill in automatically from existing SDS records.</p></div></div><div id="autofillStatus" class="banner">Start with any product name, code, supplier, composition, or SDS link.</div><form id="addChemicalForm" class="form-grid"><label class="label">Chemical or product name <input class="field" name="chemical_name" value="${escapeHtml(prefill || "")}" required></label><label class="label">Product code <input class="field" name="product_code"></label><label class="label">CAS number <input class="field" name="cas_number"></label><label class="label">Manufacturer / supplier <input class="field" name="manufacturer"></label><label class="label">SDS link <input class="field" name="sds_url"></label><label class="label">Composition / active ingredient <input class="field" name="composition"></label><label class="label">Exposure route <select class="field" name="exposure_route"><option value="">Not incident-related / unknown</option><option>Skin</option><option>Eyes</option><option>Inhalation</option><option>Ingestion</option></select></label><label class="label">Your email <input class="field" name="requested_by" type="email"></label><label class="label label-full">Notes <textarea class="textarea" name="notes"></textarea></label><div class="form-actions label-full"><button class="button primary" type="submit">Create review email</button><button class="button secondary" type="button" data-route="home">Cancel</button></div></form></section>`);
  const form = document.getElementById("addChemicalForm");
  const status = document.getElementById("autofillStatus");
  form.querySelectorAll("input, textarea, select").forEach((field) => field.addEventListener("input", () => applyAutofill(form, status)));
  if (prefill) applyAutofill(form, status);
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
  const request = loadRequests().find((item) => item.id === id);
  if (!request) return renderAddChemical();
  layout(`<section class="panel"><span class="eyebrow">Request saved</span><h1>Add Chemical Request</h1>${summaryRows([["Chemical", request.chemical_name], ["Product code", request.product_code], ["CAS", request.cas_number], ["Manufacturer", request.manufacturer], ["SDS link", request.sds_url], ["Created", request.created_at]])}<button class="button secondary" data-route="home">Back to search</button></section>`);
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
