(() => {
  const DEFAULT_API_BASE_URL = "https://chemicalsearch-backend.onrender.com";
  const API_BASE_URL = (window.CHEMICALSEARCH_API_URL || localStorage.getItem("chemicalsearch.apiBaseUrl") || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const REQUEST_KEY = "chemicalSdsLookup.requests.v1";
  const MIN_TEXT = 3;
  const TYPE_DELAY = 900;
  let timer;
  let lastLookupKey = "";
  let controller;

  function apiUrl(path) { return `${API_BASE_URL}${path}`; }
  function clean(value) { return String(value || "").trim(); }
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function makeId() { return crypto?.randomUUID ? crypto.randomUUID() : `request-${Date.now()}`; }
  function isUrl(value) { return /^https?:\/\/.{8,}/i.test(clean(value)); }
  function isCas(value) { return /^\d{2,7}-\d{2}-\d$/.test(clean(value)); }
  function usefulText(value) { return clean(value).length >= MIN_TEXT; }

  function setStatus(status, html, className = "") {
    if (!status) return;
    status.className = `banner autofill-status ${className}`.trim();
    status.innerHTML = html;
  }

  function formFields(form) {
    return {
      request_id: form.dataset.requestId || makeId(),
      chemical_name: clean(form.elements.chemical_name?.value),
      product_code: clean(form.elements.product_code?.value),
      cas_number: clean(form.elements.cas_number?.value),
      manufacturer: clean(form.elements.manufacturer?.value),
      sds_url: clean(form.elements.sds_url?.value),
      composition: clean(form.elements.composition?.value),
      exposure_route: clean(form.elements.exposure_route?.value),
      requested_by: clean(form.elements.requested_by?.value),
      notes: clean(form.elements.notes?.value)
    };
  }

  function enoughForLookup(fields) {
    if (isUrl(fields.sds_url) || isCas(fields.cas_number)) return true;
    if (usefulText(fields.chemical_name)) return true;
    if (usefulText(fields.composition)) return true;
    if (usefulText(fields.product_code) && usefulText(fields.manufacturer)) return true;
    return false;
  }

  function lookupKey(fields) {
    return JSON.stringify({ chemical_name: fields.chemical_name, product_code: fields.product_code, cas_number: fields.cas_number, manufacturer: fields.manufacturer, sds_url: fields.sds_url, composition: fields.composition });
  }

  function setIfEmpty(field, value) {
    const text = clean(value);
    if (field && !clean(field.value) && text) {
      field.value = text;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function saveRequest(request) {
    let requests = [];
    try { requests = JSON.parse(localStorage.getItem(REQUEST_KEY)) || []; } catch { requests = []; }
    requests.push(request);
    localStorage.setItem(REQUEST_KEY, JSON.stringify(requests));
  }

  function applyAutofill(form, status, result) {
    const fields = result.fields || {};
    const filledBefore = Object.fromEntries(Array.from(form.elements).filter((el) => el.name).map((el) => [el.name, clean(el.value)]));

    setIfEmpty(form.elements.chemical_name, fields.chemical_name);
    setIfEmpty(form.elements.product_code, fields.product_code);
    setIfEmpty(form.elements.cas_number, fields.cas_number);
    setIfEmpty(form.elements.manufacturer, fields.manufacturer);
    setIfEmpty(form.elements.sds_url, fields.sds_url);
    setIfEmpty(form.elements.composition, fields.composition);

    const changed = Array.from(form.elements).filter((el) => el.name && clean(el.value) && filledBefore[el.name] !== clean(el.value)).map((el) => el.name.replace(/_/g, " "));
    const links = (result.links || []).slice(0, 3).map((link) => link?.url ? `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label || "source")}</a>` : "").filter(Boolean).join(" · ");
    const notes = (result.notes || []).slice(0, 3).map((note) => `<li>${escapeHtml(note)}</li>`).join("");
    const confidence = result.confidence ? `${Math.round(result.confidence * 100)}% confidence` : "review needed";

    if (changed.length) {
      setStatus(status, `<strong>Autofill updated ${escapeHtml(changed.join(", "))}.</strong> ${escapeHtml(confidence)}<br><span>Review everything against the SDS before submitting.</span>${links ? `<br>${links}` : ""}${notes ? `<ul>${notes}</ul>` : ""}`, "is-success");
    } else {
      setStatus(status, `<strong>Autofill checked, but did not find fillable fields.</strong><br><span>The SDS may be scanned, blocked, or formatted in a way the parser cannot read yet. Add the product name/manufacturer manually and submit for review.</span>${links ? `<br>${links}` : ""}${notes ? `<ul>${notes}</ul>` : ""}`, "");
    }
  }

  async function runAutofill(form, status, options = {}) {
    const fields = formFields(form);
    if (!enoughForLookup(fields) && !options.force) {
      setStatus(status, "Keep typing, paste a direct SDS link, or click Check Autofill Now.");
      return;
    }
    const key = lookupKey(fields);
    if (key === lastLookupKey && !options.force) return;
    lastLookupKey = key;
    controller?.abort();
    controller = new AbortController();
    setStatus(status, "Checking SDS and chemical sources...", "is-loading");
    try {
      const response = await fetch(apiUrl("/api/autofill"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields, context: { source: "missing-chemical-request-form" } }), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Autofill failed");
      applyAutofill(form, status, result);
    } catch (error) {
      if (error.name === "AbortError") return;
      setStatus(status, `<strong>Autofill could not complete.</strong><br><span>${escapeHtml(error.message)} Try a more specific product name or paste a direct SDS PDF link.</span>`, "is-error");
    }
  }

  async function submitForReview(form, status) {
    const request = { ...formFields(form), created_at: new Date().toISOString(), source: "review-request", status: "pending_review" };
    saveRequest(request);
    setStatus(status, "Sending request to supervisor review workflow...", "is-loading");
    const response = await fetch(apiUrl("/api/submit-request"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not submit request");
    return { request, result };
  }

  function renderProductionRequestForm(prefill = "") {
    if (typeof layout !== "function") return;
    layout(`
      <section class="panel">
        <div class="section-heading"><div><span class="eyebrow">Request review</span><h1>Add or Update Chemical</h1><p class="lead">Enter what you know. SDS links check immediately; typed names check after you pause.</p></div></div>
        <div id="autofillStatus" class="banner autofill-status">Type a product name, CAS number, manufacturer, or paste a direct SDS link.</div>
        <form id="addChemicalForm" class="form-grid">
          <label class="label">Chemical or product name <input class="field" name="chemical_name" value="${escapeHtml(prefill)}" required autocomplete="off"></label>
          <label class="label">Product code <input class="field" name="product_code" autocomplete="off"></label>
          <label class="label">CAS number <input class="field" name="cas_number" autocomplete="off"></label>
          <label class="label">Manufacturer / supplier <input class="field" name="manufacturer" autocomplete="off"></label>
          <label class="label">SDS link <input class="field" name="sds_url" type="url" autocomplete="off"></label>
          <label class="label">Composition / active ingredient <input class="field" name="composition" autocomplete="off"></label>
          <label class="label">Exposure route <select class="field" name="exposure_route"><option value="">Not incident-related / unknown</option><option>Skin</option><option>Eyes</option><option>Inhalation</option><option>Ingestion</option></select></label>
          <label class="label">Your email <input class="field" name="requested_by" type="email" autocomplete="email"></label>
          <label class="label label-full">Notes <textarea class="textarea" name="notes"></textarea></label>
          <div class="form-actions label-full"><button class="button secondary" type="button" id="manualAutofillButton">Check Autofill Now</button><button class="button primary" type="submit">Send for supervisor review</button><button class="button secondary" type="button" data-route="home">Cancel</button></div>
        </form>
      </section>`);
    if (typeof bindButtons === "function") bindButtons();
    const form = document.getElementById("addChemicalForm");
    const status = document.getElementById("autofillStatus");
    const manual = document.getElementById("manualAutofillButton");
    if (!form) return;
    form.dataset.requestId = makeId();
    form.querySelectorAll("input, textarea, select").forEach((field) => {
      field.addEventListener("input", () => {
        clearTimeout(timer);
        const fields = formFields(form);
        if (isUrl(fields.sds_url) || isCas(fields.cas_number)) {
          setStatus(status, "SDS link/CAS detected. Checking now...", "is-loading");
          timer = setTimeout(() => runAutofill(form, status), 100);
          return;
        }
        if (!enoughForLookup(fields)) { setStatus(status, "Keep typing, paste a direct SDS link, or click Check Autofill Now."); return; }
        setStatus(status, "Waiting for you to finish typing before checking autofill...");
        timer = setTimeout(() => runAutofill(form, status), TYPE_DELAY);
      });
      field.addEventListener("paste", () => {
        clearTimeout(timer);
        timer = setTimeout(() => runAutofill(form, status), 150);
      });
      field.addEventListener("blur", () => {
        clearTimeout(timer);
        timer = setTimeout(() => runAutofill(form, status), 250);
      });
    });
    manual?.addEventListener("click", () => { clearTimeout(timer); runAutofill(form, status, { force: true }); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const { request, result } = await submitForReview(form, status);
        setStatus(status, `<strong>Request sent for supervisor review.</strong><br><span>${escapeHtml(result.message || "It will appear in ChemicalSearch after approval.")}</span>`, "is-success");
        setTimeout(() => { location.hash = `#/request/${request.request_id}`; }, 700);
      } catch (error) { setStatus(status, `<strong>Could not send request.</strong><br><span>${escapeHtml(error.message)}</span>`, "is-error"); }
    });
    if (prefill && clean(prefill).length >= 3) timer = setTimeout(() => runAutofill(form, status), 700);
  }

  window.renderAddChemical = renderProductionRequestForm;
  window.CHEMICALSEARCH_API_BASE_URL = API_BASE_URL;
  window.addEventListener("hashchange", () => { if (location.hash.replace(/^#\/?/, "").split("/")[0] === "add-chemical") setTimeout(() => renderProductionRequestForm(window.currentQuery || ""), 0); });
  if (location.hash.replace(/^#\/?/, "").split("/")[0] === "add-chemical") setTimeout(() => renderProductionRequestForm(window.currentQuery || ""), 0);
})();
