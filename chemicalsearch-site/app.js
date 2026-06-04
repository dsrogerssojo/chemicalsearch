const DB_KEY = "chemicalSafetyPrototype.v3";
const REVIEW_EMAIL = "safety-review@example.com";
const REVIEW_ACTION_BASE_URL = "https://your-domain.example/review";

const verifiedChemicals = [
  {
    id: "acetone",
    name: "Acetone",
    aliases: ["propanone", "dimethyl ketone"],
    formula: "C3H6O",
    cas_number: "67-64-1",
    hazard_level: "High",
    signal_word: "Danger",
    hazards: [
      "Highly flammable liquid and vapor.",
      "Causes serious eye irritation.",
      "May cause drowsiness or dizziness."
    ],
    symptoms: [
      "Eye, nose, and throat irritation.",
      "Headache, dizziness, nausea, or drowsiness after inhalation.",
      "Dry or irritated skin after repeated contact."
    ],
    first_aid: [
      "Eye exposure: rinse cautiously with water for several minutes and remove contact lenses if present and easy to do.",
      "Skin exposure: remove contaminated clothing and wash exposed skin with water.",
      "Inhalation: move person to fresh air and keep comfortable for breathing.",
      "Ingestion: contact Poison Control or medical personnel for instructions."
    ],
    ppe: ["Chemical splash goggles.", "Nitrile gloves.", "Lab coat.", "Use local exhaust or a fume hood for vapor control."],
    storage: ["Store in a flammable liquids cabinet.", "Keep container tightly closed and away from ignition sources."],
    disposal: ["Collect as hazardous organic solvent waste.", "Do not pour into sinks or regular trash."],
    emergency_contacts: ["Emergency: 911", "Poison Control: 1-800-222-1222", "Site Safety Officer: add local contact"],
    source_links: [
      { name: "NIOSH Pocket Guide", url: "https://www.cdc.gov/niosh/npg/npgd0004.html" },
      { name: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Acetone" }
    ],
    sds_url: "https://pubchem.ncbi.nlm.nih.gov/compound/Acetone#datasheet=LCSS",
    sds_keywords: ["sds", "safety data sheet", "flammable solvent"],
    verification_status: "verified",
    verified_by: "Internal EHS review",
    reviewed_at: "2026-06-04",
    updated_at: "2026-06-04"
  },
  {
    id: "sodium-hydroxide",
    name: "Sodium Hydroxide",
    aliases: ["caustic soda", "lye"],
    formula: "NaOH",
    cas_number: "1310-73-2",
    hazard_level: "Extreme",
    signal_word: "Danger",
    hazards: [
      "Causes severe skin burns and eye damage.",
      "Corrosive to metals.",
      "Reacts with acids and some metals."
    ],
    symptoms: [
      "Severe burning pain, redness, blistering, or tissue damage.",
      "Serious eye pain, watering, blurred vision, or vision injury.",
      "Coughing or breathing difficulty if mist or dust is inhaled."
    ],
    first_aid: [
      "Eye exposure: immediately rinse with water for at least 15 minutes and seek urgent medical care.",
      "Skin exposure: immediately remove contaminated clothing and rinse skin with water for at least 15 minutes.",
      "Inhalation: move to fresh air and get medical attention if symptoms occur.",
      "Ingestion: do not induce vomiting; call Poison Control or emergency medical services immediately."
    ],
    ppe: ["Chemical splash goggles and face shield.", "Chemical-resistant gloves.", "Lab coat or chemical apron.", "Closed-toe shoes."],
    storage: ["Store tightly closed in a corrosion-resistant container.", "Separate from acids, metals, and incompatible materials."],
    disposal: ["Dispose through approved hazardous waste procedures.", "Neutralization only by trained personnel under approved procedures."],
    emergency_contacts: ["Emergency: 911", "Poison Control: 1-800-222-1222", "Site Safety Officer: add local contact"],
    source_links: [
      { name: "NIOSH Pocket Guide", url: "https://www.cdc.gov/niosh/npg/npgd0565.html" },
      { name: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Sodium-hydroxide" }
    ],
    sds_url: "https://pubchem.ncbi.nlm.nih.gov/compound/Sodium-hydroxide#datasheet=LCSS",
    sds_keywords: ["sds", "safety data sheet", "corrosive", "caustic"],
    verification_status: "verified",
    verified_by: "Internal EHS review",
    reviewed_at: "2026-06-04",
    updated_at: "2026-06-04"
  },
  {
    id: "ethanol",
    name: "Ethanol",
    aliases: ["ethyl alcohol"],
    formula: "C2H6O",
    cas_number: "64-17-5",
    hazard_level: "High",
    signal_word: "Danger",
    hazards: [
      "Highly flammable liquid and vapor.",
      "Causes serious eye irritation.",
      "May cause respiratory irritation at high vapor concentrations."
    ],
    symptoms: [
      "Eye irritation, redness, or tearing.",
      "Headache, dizziness, or drowsiness from vapor exposure.",
      "Dry skin after repeated contact."
    ],
    first_aid: [
      "Eye exposure: rinse cautiously with water for several minutes.",
      "Skin exposure: wash with water and remove contaminated clothing.",
      "Inhalation: move to fresh air.",
      "Ingestion: call Poison Control or medical personnel for instructions."
    ],
    ppe: ["Safety glasses or chemical splash goggles.", "Nitrile gloves.", "Lab coat.", "Use ventilation away from ignition sources."],
    storage: ["Store in a flammable liquids cabinet.", "Keep away from heat, sparks, open flames, and oxidizers."],
    disposal: ["Collect as hazardous flammable solvent waste.", "Follow site hazardous waste procedures."],
    emergency_contacts: ["Emergency: 911", "Poison Control: 1-800-222-1222", "Site Safety Officer: add local contact"],
    source_links: [
      { name: "NIOSH Pocket Guide", url: "https://www.cdc.gov/niosh/npg/npgd0262.html" },
      { name: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol" }
    ],
    sds_url: "https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol#datasheet=LCSS",
    sds_keywords: ["sds", "safety data sheet", "flammable alcohol"],
    verification_status: "verified",
    verified_by: "Internal EHS review",
    reviewed_at: "2026-06-04",
    updated_at: "2026-06-04"
  }
];

const trustedSourceCache = [
  {
    id: "hydrochloric-acid-temp",
    name: "Hydrochloric Acid",
    aliases: ["muriatic acid", "hydrogen chloride solution"],
    formula: "HCl",
    cas_number: "7647-01-0",
    hazard_level: "Extreme",
    signal_word: "Danger",
    hazards: ["Corrosive; causes severe skin burns and eye damage.", "May cause respiratory irritation."],
    symptoms: ["Burning pain after skin or eye contact.", "Coughing or breathing difficulty after inhalation."],
    first_aid: [
      "Eye or skin exposure: immediately flush affected area with water.",
      "Inhalation: move to fresh air.",
      "For severe symptoms, call emergency services or Poison Control."
    ],
    ppe: ["Chemical splash goggles and face shield.", "Acid-resistant gloves.", "Lab coat or chemical apron.", "Use in fume hood."],
    storage: ["Store in a compatible acid cabinet.", "Separate from bases, oxidizers, and incompatible metals."],
    disposal: ["Manage as corrosive hazardous waste under site procedures."],
    emergency_contacts: ["Emergency: 911", "Poison Control: 1-800-222-1222", "Site Safety Officer: add local contact"],
    source_links: [
      { name: "NIOSH Pocket Guide", url: "https://www.cdc.gov/niosh/npg/npgd0332.html" },
      { name: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/Hydrochloric-acid" }
    ],
    sds_url: "https://pubchem.ncbi.nlm.nih.gov/compound/Hydrochloric-acid#datasheet=LCSS",
    sds_keywords: ["sds", "safety data sheet", "acid", "corrosive"],
    verification_status: "unverified",
    verified_by: "Imported from allowlisted public source cache",
    reviewed_at: "",
    updated_at: "2026-06-04"
  }
];

const exposureGuidance = [
  "For severe symptoms or life-threatening exposure, call 911.",
  "For exposure questions, call Poison Control at 1-800-222-1222.",
  "Follow the current SDS and your site safety procedures."
];

const hazardRank = {
  Extreme: 1,
  High: 2,
  Moderate: 3,
  Low: 4
};

let state = loadState();
let currentQuery = "";
let currentFilter = "all";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultState() {
  return {
    chemicals: clone(verifiedChemicals),
    missing_chemical_requests: [],
    add_chemical_requests: [],
    source_imports: []
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(DB_KEY));
    if (stored && Array.isArray(stored.chemicals)) {
      stored.missing_chemical_requests ||= [];
      stored.add_chemical_requests ||= [];
      stored.source_imports ||= [];
      return stored;
    }
  } catch (error) {
    console.warn("Unable to load stored data", error);
  }
  const freshState = defaultState();
  saveState(freshState);
  return freshState;
}

function saveState(nextState) {
  localStorage.setItem(DB_KEY, JSON.stringify(nextState));
}

function makeId(prefix) {
  if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function searchableValues(chemical) {
  return [
    chemical.name,
    chemical.formula,
    chemical.cas_number,
    chemical.signal_word,
    chemical.hazard_level,
    chemical.sds_url,
    ...(chemical.sds_keywords || []),
    ...(chemical.aliases || [])
  ];
}

function matchesChemical(chemical, query) {
  const q = normalize(query);
  if (!q) return true;
  return searchableValues(chemical).some((value) => normalize(value).includes(q));
}

function sourceMatches(chemical, query) {
  const q = normalize(query);
  return Boolean(q) && matchesChemical(chemical, q);
}

function findExact(query, collection = state.chemicals) {
  const q = normalize(query);
  if (!q) return undefined;
  return collection.find((chemical) => searchableValues(chemical).some((value) => normalize(value) === q));
}

function filterMatches(chemical) {
  if (currentFilter === "all") return true;
  if (currentFilter === "verified") return chemical.verification_status === "verified";
  if (currentFilter === "review") return chemical.verification_status !== "verified";
  return normalize(chemical.hazard_level) === currentFilter;
}

function resultScore(chemical) {
  const q = normalize(currentQuery);
  if (!q) return 4;
  const values = searchableValues(chemical).map(normalize);
  if (values.some((value) => value === q)) return 0;
  if (values.some((value) => value.startsWith(q))) return 1;
  if (values.some((value) => value.includes(q))) return 2;
  return 3;
}

function searchResults() {
  return state.chemicals
    .filter((chemical) => matchesChemical(chemical, currentQuery))
    .filter(filterMatches)
    .sort((a, b) => {
      return resultScore(a) - resultScore(b)
        || (hazardRank[a.hazard_level] || 9) - (hazardRank[b.hazard_level] || 9)
        || a.name.localeCompare(b.name);
    });
}

function stats() {
  const verified = state.chemicals.filter((chemical) => chemical.verification_status === "verified").length;
  const pending = state.chemicals.filter((chemical) => chemical.verification_status !== "verified").length;
  return {
    total: state.chemicals.length,
    verified,
    pending,
    missing: state.missing_chemical_requests.length,
    addRequests: state.add_chemical_requests?.length || 0,
    imports: state.source_imports.length
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hazardClass(level) {
  return normalize(level).replace(/\s+/g, "-");
}

function statusClass(status) {
  return normalize(status).replace(/\s+/g, "-");
}

function statusLabel(status) {
  return String(status || "pending_review").replace(/_/g, " ").toUpperCase();
}

function formatDate(value) {
  if (!value) return "Not reviewed";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function listItems(items) {
  return `<ul class="list">${(items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function sourceLinks(links) {
  if (!links || !links.length) return `<p class="empty">No source links attached.</p>`;
  return `<ul class="source-list">${links
    .map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.name)}</a></li>`)
    .join("")}</ul>`;
}

function sdsPanel(chemical) {
  if (!chemical.sds_url) {
    return `<p class="empty">No SDS link is attached to this internal record.</p>`;
  }
  return `
    <p class="meta">Use the current manufacturer SDS as the controlling document for site procedures.</p>
    <a class="button secondary" href="${escapeHtml(chemical.sds_url)}" target="_blank" rel="noreferrer">Open SDS reference</a>
  `;
}

function exposureGuidancePanel() {
  return `
    <div class="guidance-list">
      ${exposureGuidance.map((item) => `<div class="guidance-item">${escapeHtml(item)}</div>`).join("")}
    </div>
  `;
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
              <span class="brand-subtitle">Internal safety library</span>
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
          Internal reference only. Confirm details against the current SDS and your site safety procedures.
        </div>
      </footer>
    </div>
  `;
  bindRouteButtons();
}

function hero() {
  const summary = stats();
  return `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">Internal library</span>
          <h1>Search chemical safety profiles and SDS references.</h1>
          <p class="lead">Search by name, formula, CAS number, alias, or SDS keyword.</p>
          <div class="trust-row" aria-label="Database summary">
            <span>${summary.verified} verified records</span>
            <span>${summary.pending} pending review</span>
            <span>${summary.addRequests} add requests</span>
          </div>
        </div>
        <div class="search-panel">
          <form id="searchForm" class="search-row" role="search">
            <label class="sr-only" for="searchInput">Search chemical</label>
            <input id="searchInput" class="search-input" value="${escapeHtml(currentQuery)}" placeholder="Search acetone, NaOH, 67-64-1, SDS..." autocomplete="off" />
            <button class="button primary" type="submit">Search</button>
          </form>
          <div class="quick-searches" aria-label="Common searches">
            ${["Acetone", "NaOH", "Ethanol", "SDS"].map((query) => `<button class="quick-chip" data-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join("")}
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
          <h2 id="resultsTitle">Verified Chemical Database</h2>
          <p id="resultsMeta" class="meta"></p>
        </div>
        <button class="button secondary compact" id="resetDemo">Reset demo</button>
      </div>
      <div class="filter-row" aria-label="Result filters">
        ${filterButton("all", "All")}
        ${filterButton("verified", "Verified")}
        ${filterButton("review", "Needs review")}
        ${filterButton("extreme", "Extreme")}
        ${filterButton("high", "High")}
      </div>
      <div id="resultsList" class="cards" aria-live="polite"></div>
    </section>
  `, { showHero: true });

  renderResults();

  document.getElementById("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.getElementById("searchInput").value.trim();
    currentQuery = query;
    const exact = findExact(query);
    if (exact) {
      location.hash = `#/chemical/${exact.id}`;
      return;
    }
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
      renderResults();
    });
  });

  document.getElementById("resetDemo").addEventListener("click", () => {
    state = defaultState();
    saveState(state);
    currentQuery = "";
    currentFilter = "all";
    location.hash = "#/";
    renderHome();
  });
}

function filterButton(value, label) {
  const selected = currentFilter === value ? "is-selected" : "";
  return `<button class="filter-chip ${selected}" data-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function renderResults() {
  const results = searchResults();
  const title = document.getElementById("resultsTitle");
  const meta = document.getElementById("resultsMeta");
  const list = document.getElementById("resultsList");

  if (!title || !meta || !list) return;

  title.textContent = currentQuery ? "Search Results" : "Verified Chemical Database";
  meta.textContent = `${results.length} match${results.length === 1 ? "" : "es"} in ${stats().total} records.`;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.filter === currentFilter);
  });
  list.innerHTML = results.length ? results.map(chemicalCard).join("") : notFoundPrompt(currentQuery);
  bindRouteButtons(list);
}

function chemicalCard(chemical) {
  const isUnverified = chemical.verification_status !== "verified";
  return `
    <button class="chemical-card hazard-${hazardClass(chemical.hazard_level)}" data-chemical-id="${escapeHtml(chemical.id)}">
      <span class="hazard-rail" aria-hidden="true"></span>
      <span class="card-content">
        <span class="card-top">
          <span>
            <strong class="chemical-name">${escapeHtml(chemical.name)}</strong>
            <span class="meta">${escapeHtml(chemical.formula)} | CAS ${escapeHtml(chemical.cas_number)}</span>
          </span>
          <span class="badge ${isUnverified ? "pending-review" : hazardClass(chemical.hazard_level)}">${escapeHtml(isUnverified ? "Review" : chemical.hazard_level)}</span>
        </span>
        <span class="card-preview">
          <span><strong>Primary symptom:</strong> ${escapeHtml((chemical.symptoms || [])[0] || "Not listed")}</span>
          <span><strong>PPE:</strong> ${escapeHtml((chemical.ppe || [])[0] || "Not listed")}</span>
        </span>
        <span class="card-footer">
          <span>${escapeHtml(statusLabel(chemical.verification_status))} | Updated ${escapeHtml(formatDate(chemical.updated_at))}</span>
          <span class="open-label">Open profile</span>
        </span>
      </span>
    </button>
  `;
}

function notFoundPrompt(query) {
  return `
    <div class="not-found-block">
      <div class="banner">
        <strong>No internal record found</strong>
        No internal record matched "${escapeHtml(query || "your search")}".
      </div>
      <div class="not-found-actions">
        <button class="button primary" data-route="add-chemical">Request this chemical</button>
        <button class="button secondary" data-route="home">Back to search</button>
      </div>
    </div>
  `;
}

function renderChemical(id) {
  const chemical = state.chemicals.find((item) => item.id === id);
  if (!chemical) {
    renderNotFound(currentQuery);
    return;
  }

  const isUnverified = chemical.verification_status !== "verified";
  layout(`
    ${isUnverified ? `
      <div class="banner warning">
        <strong>UNVERIFIED temporary profile</strong>
        This record is pending internal review. Use emergency contacts, SDS, and source links. Do not treat this as approved medical guidance.
      </div>
    ` : ""}
    <section class="detail-header hazard-${hazardClass(chemical.hazard_level)}">
      <span class="hazard-rail" aria-hidden="true"></span>
      <div class="detail-main">
        <div class="detail-kicker">
          <span class="badge ${isUnverified ? "pending-review" : hazardClass(chemical.hazard_level)}">${escapeHtml(isUnverified ? "UNVERIFIED" : chemical.hazard_level)}</span>
          <span class="badge status-${statusClass(chemical.verification_status)}">${escapeHtml(statusLabel(chemical.verification_status))}</span>
        </div>
        <h1 class="detail-title">${escapeHtml(chemical.name)}</h1>
        <p class="detail-meta">${escapeHtml(chemical.formula)} | CAS ${escapeHtml(chemical.cas_number)} | Signal word: ${escapeHtml(chemical.signal_word || "Not listed")}</p>
        <p class="meta">Reviewed by ${escapeHtml(chemical.verified_by || "Pending reviewer")} | Updated ${escapeHtml(formatDate(chemical.updated_at))}</p>
      </div>
      <div class="detail-actions">
        ${chemical.sds_url ? `<a class="button primary" href="${escapeHtml(chemical.sds_url)}" target="_blank" rel="noreferrer">Open SDS</a>` : ""}
        <button class="button secondary" data-route="add-chemical">Suggest update</button>
      </div>
    </section>
    <div class="grid priority-grid">
      <section class="panel priority"><h2>Symptoms of Exposure</h2>${listItems(chemical.symptoms)}</section>
      <section class="panel priority"><h2>First Aid / Treatment</h2>${listItems(chemical.first_aid)}</section>
    </div>
    <div class="grid">
      <section class="panel"><h2>Hazards</h2>${listItems(chemical.hazards)}</section>
      <section class="panel"><h2>PPE</h2>${listItems(chemical.ppe)}</section>
      <section class="panel"><h2>Storage</h2>${listItems(chemical.storage)}</section>
      <section class="panel"><h2>Disposal</h2>${listItems(chemical.disposal)}</section>
      <section class="panel"><h2>SDS Reference</h2>${sdsPanel(chemical)}</section>
      <section class="panel"><h2>Sources / Verification</h2>${sourceLinks(chemical.source_links)}</section>
    </div>
  `, { pageClass: "detail-page" });
}

function renderNotFound(query = "") {
  layout(`
    <section class="panel not-found-page">
      <div class="section-heading">
        <div>
          <span class="eyebrow">Not in library</span>
          <h1>No internal record found</h1>
          <p class="lead">Request a new record and include an SDS link or manufacturer details if you have them.</p>
        </div>
      </div>
      <div class="form-actions">
        <button class="button primary" data-route="add-chemical">Add chemical request</button>
        <button class="button secondary" data-route="home">Back to search</button>
      </div>
    </section>
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>Exposure Note</h2>
          <p class="meta">If this lookup is related to an active exposure, use the current SDS and site response procedure.</p>
        </div>
      </div>
      ${exposureGuidancePanel()}
    </section>
  `);
}

function buildReviewEmail(request) {
  const approveUrl = `${REVIEW_ACTION_BASE_URL}?request=${encodeURIComponent(request.id)}&action=approve`;
  const rejectUrl = `${REVIEW_ACTION_BASE_URL}?request=${encodeURIComponent(request.id)}&action=reject`;
  const subject = `Chemical library request: ${request.chemical_name || "New chemical"}`;
  const body = [
    "A new chemical has been requested for the internal safety library.",
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
          <p class="lead">Submit a chemical or SDS reference for reviewer approval before it appears as verified in the internal library.</p>
        </div>
      </div>
      <div class="banner info">
        <strong>Email approval workflow</strong>
        This prototype opens a prefilled email to ${escapeHtml(REVIEW_EMAIL)}. A production version should send this form through a backend email service and make the approval links secure.
      </div>
      <form id="addChemicalForm" class="form-grid">
        <label class="label">Chemical name <input class="field" name="chemical_name" value="${escapeHtml(prefill || "")}" required /></label>
        <label class="label">Formula <input class="field" name="formula" placeholder="Example: C3H6O" /></label>
        <label class="label">CAS number <input class="field" name="cas_number" placeholder="Example: 67-64-1" /></label>
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
      status: "email_draft_created",
      review_email: REVIEW_EMAIL,
      created_at: new Date().toISOString()
    };
    request.mailto = buildReviewEmail(request);
    state.add_chemical_requests ||= [];
    state.add_chemical_requests.push(request);
    saveState(state);
    location.hash = `#/request/${request.id}`;
    window.setTimeout(() => {
      window.location.href = request.mailto;
    }, 100);
  });
}

function renderMissing(id) {
  const request = state.missing_chemical_requests.find((item) => item.id === id);
  layout(`
    <div class="banner">
      <strong>Request saved</strong>
      The request was saved for follow-up.
    </div>
    <section class="panel">
      <h1>Missing Chemical Request</h1>
      ${exposureGuidancePanel()}
    </section>
    <section class="panel receipt">
      <h2>Saved for Review</h2>
      <dl class="summary-list">
        <div><dt>Chemical</dt><dd>${escapeHtml(request?.chemical_name || "Unknown")}</dd></div>
        <div><dt>CAS</dt><dd>${escapeHtml(request?.cas_number || "Not provided")}</dd></div>
        <div><dt>Exposure</dt><dd>${escapeHtml(request?.exposure_type || "unknown")}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(request?.status || "needs_review")}</dd></div>
      </dl>
      <div class="form-actions">
        <button class="button secondary" data-route="home">Back to search</button>
        <button class="button primary" data-route="add-chemical">Add chemical details</button>
      </div>
    </section>
  `);
}

function renderRequestReceipt(id) {
  const request = state.add_chemical_requests?.find((item) => item.id === id);
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
      <dl class="summary-list">
        <div><dt>Chemical</dt><dd>${escapeHtml(request.chemical_name || "Not provided")}</dd></div>
        <div><dt>Formula</dt><dd>${escapeHtml(request.formula || "Not provided")}</dd></div>
        <div><dt>CAS</dt><dd>${escapeHtml(request.cas_number || "Not provided")}</dd></div>
        <div><dt>Manufacturer</dt><dd>${escapeHtml(request.manufacturer || "Not provided")}</dd></div>
        <div><dt>SDS</dt><dd>${request.sds_url ? `<a href="${escapeHtml(request.sds_url)}" target="_blank" rel="noreferrer">${escapeHtml(request.sds_url)}</a>` : "Not provided"}</dd></div>
        <div><dt>Reviewer email</dt><dd>${escapeHtml(request.review_email)}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(statusLabel(request.status))}</dd></div>
      </dl>
      <div class="form-actions">
        <a class="button primary" href="${escapeHtml(request.mailto)}">Open review email</a>
        <button class="button secondary" data-route="home">Back to search</button>
      </div>
    </section>
  `);
}

function bindRouteButtons(scope = document) {
  scope.querySelectorAll("[data-route]:not([data-bound])").forEach((button) => {
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const routeName = button.dataset.route;
      if (routeName === "home") location.hash = "#/";
      if (routeName === "add-chemical") location.hash = "#/add-chemical";
      if (routeName === "not-found") location.hash = "#/not-found";
    });
  });
  scope.querySelectorAll("[data-chemical-id]:not([data-bound])").forEach((button) => {
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      location.hash = `#/chemical/${button.dataset.chemicalId}`;
    });
  });
}

function route() {
  const [page, id] = location.hash.replace(/^#\/?/, "").split("/");
  if (!page) renderHome();
  else if (page === "chemical") renderChemical(id);
  else if (page === "temporary") renderChemical(id);
  else if (page === "missing") renderMissing(id);
  else if (page === "add-chemical") renderAddChemical();
  else if (page === "request") renderRequestReceipt(id);
  else if (page === "not-found") renderNotFound(currentQuery);
  else renderHome();
}

window.addEventListener("hashchange", route);
route();
