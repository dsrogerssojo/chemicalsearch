(() => {
  const AUTOFILL_ENDPOINT = "/api/autofill";
  const REQUEST_KEY = "chemicalSdsLookup.requests.v1";
  let timer;
  let lastPayload = "";
  let latestController;

  function clean(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setIfEmpty(field, value) {
    const text = clean(value);
    if (field && !clean(field.value) && text) field.value = text;
  }

  function makeId() {
    return crypto?.randomUUID ? crypto.randomUUID() : `request-${Date.now()}`;
  }

  function loadRequests() {
    try {
      const requests = JSON.parse(localStorage.getItem(REQUEST_KEY));
      return Array.isArray(requests) ? requests : [];
    } catch {
      return [];
    }
  }

  function saveRequest(request) {
    const requests = loadRequests();
    requests.push(request);
    localStorage.setItem(REQUEST_KEY, JSON.stringify(requests));
  }

  function formFields(form) {
    return {
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

  function lookupPayload(form) {
    const fields = formFields(form);
    return {
      fields,
      context: {
        source: "missing-chemical-request-form",
        version: "production-autofill-v1"
      }
    };
  }

  function hasEnoughInput(fields) {
    return [fields.chemical_name, fields.product_code, fields.cas_number, fields.manufacturer, fields.sds_url, fields.composition]
      .some((value) => clean(value).length >= 3);
  }

  function statusMessage(status, html, className = "") {
    if (!status) return;
    status.className = `banner autofill-status ${className}`.trim();
    status.innerHTML = html;
  }

  function sourceList(result) {
    const sources = (result.sources || [])
      .filter((item) => item?.source)
      .map((item) => `${item.source}${item.confidence ? ` (${Math.round(item.confidence * 100)}%)` : ""}`);
    return [...new Set(sources)].join(" · ");
  }

  function applyAutofillResult(form, status, result) {
    const fields = result.fields || {};
    setIfEmpty(form.elements.chemical_name, fields.chemical_name);
    setIfEmpty(form.elements.product_code, fields.product_code);
    setIfEmpty(form.elements.cas_number, fields.cas_number);
    setIfEmpty(form.elements.manufacturer, fields.manufacturer);
    setIfEmpty(form.elements.sds_url, fields.sds_url);
    setIfEmpty(form.elements.composition, fields.composition);

    const notes = [
      ...(Array.isArray(result.notes) ? result.notes : []),
      result.warning || "Autofill is a review aid only. Verify against the current official SDS."
    ].filter(Boolean);

    if (notes.length && form.elements.notes) {
      const current = clean(form.elements.notes.value);
      const noteBlock = notes.join("\n");
      if (!current) form.elements.notes.value = noteBlock;
      else if (!current.includes(notes[0])) form.elements.notes.value = `${current}\n\n${noteBlock}`;
    }

    const links = (result.links || [])
      .slice(0, 3)
      .map((link) => link?.url ? `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label || link.url)}</a>` : "")
      .filter(Boolean)
      .join(" · ");

    const confidence = result.confidence ? `${Math.round(result.confidence * 100)}% confidence` : "Review required";
    const sources = sourceList(result) || "External lookup";
    statusMessage(
      status,
      `<strong>Autofill found data.</strong> ${escapeHtml(confidence)} · ${escapeHtml(sources)}<br><span>Empty fields were filled where possible. Verify everything against the official SDS before submitting.</span>${links ? `<br>${links}` : ""}`,
      "is-success"
    );
  }

  async function runAutofill(form, status) {
    const payload = lookupPayload(form);
    if (!hasEnoughInput(payload.fields)) {
      statusMessage(status, "Start with any product name, code, CAS number, supplier, composition, or SDS link.");
      return;
    }

    const payloadKey = JSON.stringify(payload.fields);
    if (payloadKey === lastPayload) return;
    lastPayload = payloadKey;

    latestController?.abort();
    latestController = new AbortController();

    statusMessage(status, "Looking up external chemical and SDS sources...", "is-loading");

    try {
      const response = await fetch(AUTOFILL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: latestController.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Autofill request failed");
      applyAutofillResult(form, status, result);
    } catch (error) {
      if (error.name === "AbortError") return;
      statusMessage(
        status,
        `<strong>External autofill is not available from this deployment.</strong><br><span>Deploy this repo on Netlify so /api/autofill can run, then add a search API key for product-specific SDS lookup. Chemical identity lookup uses PubChem through the backend.</span>`,
        "is-error"
      );
    }
  }

  function renderProductionRequestForm(prefill = "") {
    if (typeof layout !== "function") return;
    layout(`
      <section class="panel">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Request review</span>
            <h1>Add or Update Chemical</h1>
            <p class="lead">Start with any field you know. The system checks external chemical identity and SDS sources, fills what it can, and keeps the request marked for review.</p>
          </div>
        </div>
        <div id="autofillStatus" class="banner autofill-status">Start with any product name, code, CAS number, supplier, composition, or SDS link.</div>
        <form id="addChemicalForm" class="form-grid">
          <label class="label">Chemical or product name <input class="field" name="chemical_name" value="${escapeHtml(prefill || "")}" required></label>
          <label class="label">Product code <input class="field" name="product_code"></label>
          <label class="label">CAS number <input class="field" name="cas_number"></label>
          <label class="label">Manufacturer / supplier <input class="field" name="manufacturer"></label>
          <label class="label">SDS link <input class="field" name="sds_url"></label>
          <label class="label">Composition / active ingredient <input class="field" name="composition"></label>
          <label class="label">Exposure route <select class="field" name="exposure_route"><option value="">Not incident-related / unknown</option><option>Skin</option><option>Eyes</option><option>Inhalation</option><option>Ingestion</option></select></label>
          <label class="label">Your email <input class="field" name="requested_by" type="email"></label>
          <label class="label label-full">Notes <textarea class="textarea" name="notes"></textarea></label>
          <div class="form-actions label-full"><button class="button primary" type="submit">Create review email</button><button class="button secondary" type="button" data-route="home">Cancel</button></div>
        </form>
      </section>
    `);

    if (typeof bindButtons === "function") bindButtons();

    const form = document.getElementById("addChemicalForm");
    const status = document.getElementById("autofillStatus");

    form.querySelectorAll("input, textarea, select").forEach((field) => {
      field.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => runAutofill(form, status), 750);
      });
      field.addEventListener("blur", () => runAutofill(form, status));
    });

    if (prefill) setTimeout(() => runAutofill(form, status), 350);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const request = formFields(form);
      request.id = makeId();
      request.created_at = new Date().toISOString();
      request.source = "production-autofill-review-request";
      request.status = "pending_review";
      saveRequest(request);
      location.hash = `#/request/${request.id}`;
    });
  }

  window.renderAddChemical = renderProductionRequestForm;

  window.addEventListener("hashchange", () => {
    const [page] = location.hash.replace(/^#\/?/, "").split("/");
    if (page === "add-chemical") {
      setTimeout(() => renderProductionRequestForm(window.currentQuery || ""), 0);
    }
  });

  if (location.hash.replace(/^#\/?/, "").split("/")[0] === "add-chemical") {
    setTimeout(() => renderProductionRequestForm(window.currentQuery || ""), 0);
  }
})();
