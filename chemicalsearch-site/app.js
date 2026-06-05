const REVIEW_EMAIL = "safety-review@example.com";
const REVIEW_ACTION_BASE_URL = "https://your-domain.example/review";
const REQUEST_KEY = "chemicalSdsLookup.requests.v1";

const records = Array.isArray(globalThis.SDS_RECORDS)
  ? [...globalThis.SDS_RECORDS].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
  : [];

let currentQuery = "";

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  return text;
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
    record.sds_url
  ];
}

function matchesRecord(record, query) {
  const q = normalize(query);
  if (!q) return true;
  return searchableValues(record).some((value) => normalize(value).includes(q));
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
  return records
    .filter((record) => matchesRecord(record, currentQuery))
    .sort((a, b) => resultScore(a) - resultScore(b) || String(a.name || "").localeCompare(String(b.name || "")));
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
              <span class="brand-title">Chemical Safety</span>
              <span class="brand-subtitle">Internal SDS library</span>
            </span>
          </button>
          <nav class="nav-actions" aria-label="Primary">
            <button class="button secondary compact" data-route="home">Search</button>
            <button class="button primary compact" data-route="add-chemical">Add chemical</button>
          </nav>
        </div>
      </header>
      ${showHero ? hero() : ""}
      <main class="main">${content}</main>
      <footer class="footer">
        <div class="footer-inner">
          Internal reference only. Confirm procedures against the current SDS and your site requirements.
        </div>
      </footer>
    </div>
  `;
  bindRouteButtons();
}

function hero() {
  return `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">Internal library</span>
          <h1>Search SDS records by product, use, company, or SDS details.</h1>
          <p class="lead">Open a record to see basic details, composition, and the linked SDS reference.</p>
        </div>
        <div class="search-panel">
          <form id="searchForm" class="search-row" role="search">
            <label class="sr-only" for="searchInput">Search SDS records</label>
            <input id="searchInput" class="search-input" value="${escapeHtml(currentQuery)}" placeholder="Search cleaner, Loctite, product code, SDS..." autocomplete="off" />
            <button class="button primary" type="submit">Search</button>
          </form>
          <div class="quick-searches" aria-label="Common searches">
            ${["Cleaner", "Lubricant", "Bleach", "Loctite"].map((query) => `<button class="quick-chip" data-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join("")}
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
          <h2 id="resultsTitle">Search Results</h2>
          <p id="resultsMeta" class="meta"></p>
        </div>
      </div>
      <div id="resultsList" class="cards" aria-live="polite"></div>
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
  return `
    <button class="chemical-card" data-chemical-id="${escapeHtml(record.id)}">
      <span class="card-content">
        <span class="card-top">
          <span>
            <strong class="chemical-name">${escapeHtml(record.name)}</strong>
            <span class="meta">${escapeHtml(subline || "Product details")}</span>
          </span>
        </span>
        <span class="card-preview">
          <span><strong>Use:</strong> ${displayValue(record.use)}</span>
          <span><strong>Composition:</strong> ${escapeHtml(composition)}</span>
        </span>
        <span class="card-footer">
          <span>Updated ${escapeHtml(formatDate(record.updated_at))}</span>
          <span class="open-label">Open record</span>
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
    <a class="button secondary" href="${escapeHtml(record.sds_url)}" target="_blank" rel="noreferrer">Open SDS reference</a>
    ${reference ? `<p class="meta">PDF reference: ${escapeHtml(reference)}</p>` : ""}
  `;
}

function renderRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    renderNotFound(currentQuery);
    return;
  }

  const detailMeta = [record.company, cleanValue(record.product_code) ? `Code ${record.product_code}` : "", record.use].filter(Boolean).join(" | ");
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
        <h1 class="detail-title">${escapeHtml(record.name)}</h1>
        <p class="detail-meta">${escapeHtml(detailMeta || "SDS record")}</p>
        <p class="meta">Updated ${escapeHtml(formatDate(record.updated_at))}</p>
      </div>
      <div class="detail-actions">
        ${record.sds_url ? `<a class="button primary" href="${escapeHtml(record.sds_url)}" target="_blank" rel="noreferrer">Open SDS</a>` : ""}
        <button class="button secondary" data-route="add-chemical">Suggest update</button>
      </div>
    </section>
    <div class="grid">
      <section class="panel"><h2>Basic Details</h2>${summaryRows(details)}</section>
      <section class="panel"><h2>Chemical Composition</h2><p>${escapeHtml(cleanValue(record.composition) || "See SDS for composition details.")}</p></section>
      <section class="panel"><h2>SDS Reference</h2>${sdsPanel(record)}</section>
      <section class="panel"><h2>Handling Notes</h2><p>Use the linked SDS and your site procedures for PPE, storage, handling, and disposal details.</p></section>
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
          <h1>Add Chemical</h1>
          <p class="lead">Submit a chemical, product code, or SDS reference for reviewer approval.</p>
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
        <label class="label">Your email <input class="field" name="requested_by" type="email" placeholder="name@example.com" /></label>
        <label class="label">Notes <span>Location, product code, concentration, or reason for adding</span><textarea class="textarea" name="notes"></textarea></label>
        <div class="form-actions">
          <button class="button primary" type="submit">Create email request</button>
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

window.addEventListener("hashchange", route);
route();
