function safeText(value) {
  return String(value || "").trim();
}

function normalizedText(value) {
  return safeText(value).toLowerCase();
}

function setIfEmpty(form, name, value) {
  const field = form.elements[name];
  if (!field || safeText(field.value) || !safeText(value)) return;
  field.value = value;
}

function recordSearchText(record) {
  return [record.name, record.company, record.product_code, record.composition, record.sds_url, record.sds_number, record.sds_reference, record.use]
    .map(normalizedText)
    .join(" ");
}

function bestAutofillMatch(form) {
  const values = [
    form.elements.chemical_name?.value,
    form.elements.product_code?.value,
    form.elements.cas_number?.value,
    form.elements.manufacturer?.value,
    form.elements.sds_url?.value,
    form.elements.composition?.value
  ].map(normalizedText).filter((value) => value.length >= 3);

  if (!values.length || !Array.isArray(globalThis.SDS_RECORDS)) return null;

  let best = null;
  let bestScore = 0;

  for (const record of globalThis.SDS_RECORDS) {
    const haystack = recordSearchText(record);
    let score = 0;
    for (const value of values) {
      if (normalizedText(record.name) === value) score += 8;
      if (normalizedText(record.product_code) === value) score += 7;
      if (normalizedText(record.company) === value) score += 5;
      if (haystack.includes(value)) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = record;
    }
  }

  return bestScore >= 3 ? best : null;
}

function applyAutofill(form, status) {
  const match = bestAutofillMatch(form);
  if (!match) {
    status.textContent = "Start with any product name, code, supplier, composition, or SDS link. Matching fields will auto-fill from the current library.";
    return;
  }

  setIfEmpty(form, "chemical_name", match.name);
  setIfEmpty(form, "product_code", match.product_code);
  setIfEmpty(form, "manufacturer", match.company);
  setIfEmpty(form, "sds_url", match.sds_url);
  setIfEmpty(form, "composition", match.composition);

  const note = [
    safeText(match.use) ? `Use: ${match.use}` : "",
    safeText(match.hfrp_info) ? `HFRP: ${match.hfrp_info}` : "",
    safeText(match.sds_number) ? `SDS number: ${match.sds_number}` : "",
    safeText(match.sds_version) ? `SDS version: ${match.sds_version}` : ""
  ].filter(Boolean).join("\n");

  setIfEmpty(form, "notes", note);
  status.innerHTML = `<strong>Auto-filled:</strong> ${escapeHtml(match.name)}${match.product_code ? ` · ${escapeHtml(match.product_code)}` : ""}`;
}

function sdsPanel(record) {
  if (!record.sds_url) {
    return `<p class="empty">No SDS link is attached to this record.</p>`;
  }
  return `
    <p class="meta compact-help">Open the current safety document for full handling, PPE, storage, exposure, and disposal guidance.</p>
    <a class="button primary sds-open-button" href="${escapeHtml(record.sds_url)}" target="_blank" rel="noreferrer">Open official SDS</a>
  `;
}

function removePdfReferences() {
  document.querySelectorAll(".panel, .sds-section-grid section, .detail-page *").forEach((node) => {
    if (!node || !node.textContent) return;
    if (node.children.length === 0 && node.textContent.trim().toLowerCase().startsWith("pdf reference:")) {
      node.remove();
    }
  });
}

function renderAddChemical(prefill = currentQuery) {
  layout(`
    <section class="panel add-panel">
      <div class="section-heading clean-heading">
        <div>
          <span class="eyebrow">Request review</span>
          <h1>Add or Update Chemical</h1>
          <p class="lead">Start with any field you know. If it matches an existing SDS record, the rest of the form fills in automatically.</p>
        </div>
      </div>
      <div id="autofillStatus" class="banner info autofill-status">
        Start with any product name, code, supplier, composition, or SDS link. Matching fields will auto-fill from the current library.
      </div>
      <form id="addChemicalForm" class="form-grid enhanced-form">
        <label class="label">Chemical or product name <input class="field" name="chemical_name" value="${escapeHtml(prefill || "")}" required /></label>
        <label class="label">Product code <input class="field" name="product_code" placeholder="Example: S-19455" /></label>
        <label class="label">CAS number <input class="field" name="cas_number" placeholder="Optional" /></label>
        <label class="label">Manufacturer / supplier <input class="field" name="manufacturer" placeholder="Company or supplier" /></label>
        <label class="label">SDS link <input class="field" name="sds_url" placeholder="Paste SDS URL" /></label>
        <label class="label">Composition / active ingredient <input class="field" name="composition" placeholder="Auto-filled when available" /></label>
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
        <label class="label label-full">Notes <span>Location, concentration, label warnings, symptoms, or reason for adding</span><textarea class="textarea" name="notes"></textarea></label>
        <div class="form-actions label-full">
          <button class="button primary" type="submit">Create review email</button>
          <button class="button secondary" type="button" data-route="home">Cancel</button>
        </div>
      </form>
    </section>
  `);

  const form = document.getElementById("addChemicalForm");
  const status = document.getElementById("autofillStatus");
  let autofillTimer;

  form.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => {
      window.clearTimeout(autofillTimer);
      autofillTimer = window.setTimeout(() => applyAutofill(form, status), 140);
    });
  });

  if (safeText(prefill)) applyAutofill(form, status);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const request = {
      id: makeId("add"),
      chemical_name: safeText(formData.get("chemical_name")),
      product_code: safeText(formData.get("product_code")),
      formula: safeText(formData.get("composition")),
      cas_number: safeText(formData.get("cas_number")),
      manufacturer: safeText(formData.get("manufacturer")),
      sds_url: safeText(formData.get("sds_url")),
      exposure_route: safeText(formData.get("exposure_route")),
      requested_by: safeText(formData.get("requested_by")),
      notes: safeText(formData.get("notes")),
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

function addCleanupStyles() {
  if (document.getElementById("layout-cleanup-styles")) return;
  const style = document.createElement("style");
  style.id = "layout-cleanup-styles";
  style.textContent = `
    .main{gap:16px}.panel{border-radius:14px;padding:18px}.topbar-inner,.emergency-strip-inner,.hero-inner,.main,.footer-inner{max-width:1120px}.hero-inner{max-width:1120px}.hero h1{font-size:clamp(1.65rem,3.2vw,2.8rem);line-height:1.05}.detail-title{font-size:clamp(1.55rem,2.4vw,2.25rem)!important;letter-spacing:-.025em;margin-bottom:6px}.detail-header{padding:16px;margin-bottom:0;align-items:center}.detail-meta{font-size:.95rem}.detail-actions{align-items:center}.hazard-overview{grid-template-columns:190px 1fr;gap:12px}.nfpa-diamond{width:124px;height:124px;margin:8px}.nfpa-cell{width:60px;height:60px;font-size:1rem}.nfpa-health{left:0;top:32px}.nfpa-fire{left:32px;top:0}.nfpa-reactivity{right:0;top:32px}.nfpa-special{left:32px;bottom:0}.sds-section-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:0}.sds-section-grid .panel{min-height:0}.sds-section-grid h2,.panel h2{font-size:1.15rem;margin-bottom:8px}.sds-section-grid p,.panel p{font-size:.98rem;line-height:1.45}.summary-list div{padding:8px 0}.chemical-card{min-height:auto;border-radius:12px}.card-content{padding:16px}.sds-open-button{margin-top:6px}.compact-help{margin-bottom:12px}.add-panel{max-width:940px;margin:0 auto;width:100%}.clean-heading{border-bottom:1px solid var(--line);padding-bottom:12px}.enhanced-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.enhanced-form .label-full{grid-column:1/-1}.autofill-status{margin:12px 0;background:#eaf4ff;border:1px solid #c6def7;border-radius:12px;padding:12px;color:#15354f}.label span{display:block;color:var(--muted);font-weight:400;margin-top:3px}.field,.textarea{border-radius:10px}.button{border-radius:10px}.emergency-strip-inner{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.hotline{min-height:44px}.hotline-copy{font-size:.78rem}@media(max-width:820px){.hazard-overview,.sds-section-grid,.enhanced-form,.hero-inner,.emergency-strip-inner{grid-template-columns:1fr}.detail-header{display:block}.card-content{padding:14px}}
  `;
  document.head.appendChild(style);
}

addCleanupStyles();
if (typeof route === "function") route();
removePdfReferences();
new MutationObserver(removePdfReferences).observe(document.body, { childList: true, subtree: true });
