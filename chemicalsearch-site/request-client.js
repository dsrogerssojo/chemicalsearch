(() => {
  const DEFAULT_API_BASE_URL = "https://chemicalsearch-backend.onrender.com";
  const API_BASE_URL = (window.CHEMICALSEARCH_API_URL || localStorage.getItem("chemicalsearch.apiBaseUrl") || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const REQUEST_KEY = "chemicalSdsLookup.requests.v1";

  function apiUrl(path) { return `${API_BASE_URL}${path}`; }
  function clean(value) { return String(value || "").trim(); }
  function getUpdateRecord(recordId) {
    if (!recordId) return null;
    return (globalThis.CHEMICALSEARCH_RECORDS || []).find((record) => record.id === recordId) || null;
  }

  function fieldValue(record, key, fallback = "") {
    return escapeHtml(record?.[key] ?? fallback ?? "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function makeId() { return crypto?.randomUUID ? crypto.randomUUID() : `request-${Date.now()}`; }

  function setStatus(status, html, className = "") {
    if (!status) return;
    status.className = `banner request-status ${className}`.trim();
    status.innerHTML = html;
  }

  function closeSubmissionDialog() {
    document.getElementById("submissionDialog")?.remove();
  }

  function showSubmissionDialog(request, message) {
    closeSubmissionDialog();
    const requestId = request.request_id || request.id;
    const sentToTeams = request.delivery_status === "sent_to_teams";
    const dialog = document.createElement("div");
    dialog.id = "submissionDialog";
    dialog.className = "submission-dialog-backdrop";
    dialog.innerHTML = `
      <section class="submission-dialog" role="dialog" aria-modal="true" aria-labelledby="submissionDialogTitle">
        <button class="submission-dialog-close" type="button" aria-label="Close confirmation">&times;</button>
        <span class="submission-dialog-icon" aria-hidden="true">&#10003;</span>
        <span class="eyebrow">Request submitted</span>
        <h2 id="submissionDialogTitle">${sentToTeams ? "Sent for supervisor review" : "Request saved"}</h2>
        <p>${escapeHtml(message || request.submit_message || "Your request was received.")}</p>
        <dl class="submission-dialog-details">
          <div><dt>Request ID</dt><dd>${escapeHtml(requestId)}</dd></div>
          <div><dt>Chemical</dt><dd>${escapeHtml(request.chemical_name || "Not listed")}</dd></div>
        </dl>
        <div class="submission-dialog-actions">
          <button class="button primary" type="button" data-dialog-action="receipt">View receipt</button>
          <button class="button secondary" type="button" data-dialog-action="home">Back to search</button>
        </div>
      </section>`;
    document.body.appendChild(dialog);
    const receiptButton = dialog.querySelector('[data-dialog-action="receipt"]');
    const homeButton = dialog.querySelector('[data-dialog-action="home"]');
    const closeButton = dialog.querySelector(".submission-dialog-close");
    const closeAndRoute = (hash) => {
      closeSubmissionDialog();
      location.hash = hash;
    };
    receiptButton?.addEventListener("click", () => closeAndRoute(`#/request/${requestId}`));
    homeButton?.addEventListener("click", () => closeAndRoute("#/"));
    closeButton?.addEventListener("click", closeSubmissionDialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeSubmissionDialog();
    });
    const escapeHandler = (event) => {
      if (event.key === "Escape") {
        closeSubmissionDialog();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);
    receiptButton?.focus();
  }

  function formFields(form) {
    const requestId = form.dataset.requestId || makeId();
    return {
      id: requestId,
      request_id: requestId,
      record_id: clean(form.elements.record_id?.value),
      chemical_name: clean(form.elements.chemical_name?.value),
      product_code: clean(form.elements.product_code?.value),
      cas_number: clean(form.elements.cas_number?.value),
      manufacturer: clean(form.elements.manufacturer?.value),
      sds_url: clean(form.elements.sds_url?.value),
      use: clean(form.elements.use?.value),
      sds_number: clean(form.elements.sds_number?.value),
      sds_version: clean(form.elements.sds_version?.value),
      issue_date: clean(form.elements.issue_date?.value),
      revision_date: clean(form.elements.revision_date?.value),
      supersedes_date: clean(form.elements.supersedes_date?.value),
      hfrp_info: clean(form.elements.hfrp_info?.value),
      composition: clean(form.elements.composition?.value),
      requested_by: clean(form.elements.requested_by?.value),
      notes: clean(form.elements.notes?.value)
    };
  }

  function saveRequest(request) {
    let requests = [];
    try { requests = JSON.parse(localStorage.getItem(REQUEST_KEY)) || []; } catch { requests = []; }
    const index = requests.findIndex((item) => item.id === request.id || item.request_id === request.request_id);
    if (index >= 0) requests[index] = { ...requests[index], ...request };
    else requests.push(request);
    localStorage.setItem(REQUEST_KEY, JSON.stringify(requests));
  }

  async function submitForReview(form, status) {
    const request = { ...formFields(form), created_at: new Date().toISOString(), source: "review-request", status: "pending_review" };
    setStatus(status, "Sending request to supervisor review workflow...", "is-loading");
    try {
      const response = await fetch(apiUrl("/api/submit-request"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit request");
      request.delivery_status = result.queued === false ? "saved_without_teams" : "sent_to_teams";
      request.submit_message = result.message || "Request sent for supervisor review.";
      saveRequest(request);
      return { request, result };
    } catch (error) {
      request.delivery_status = "local_only";
      request.submit_message = `${error.message || "Could not submit request"} The request was saved in this browser, but it may not have reached Teams.`;
      saveRequest(request);
      throw error;
    }
  }

  function renderProductionRequestForm(prefill = "") {
    if (typeof layout !== "function") return;
    const updateRecord = getUpdateRecord(prefill);
    const formTitle = updateRecord ? "Suggest Product Update" : "Add or Update Chemical";
    const formIntro = updateRecord
      ? "Review the current product information below, change only what should be corrected, and send it to a supervisor for approval."
      : "Enter the information you know from the label, SDS, supplier page, or product container. The request is sent to a supervisor for review and approval before it appears in ChemicalSearch.";
    const productName = updateRecord ? updateRecord.name : prefill;
    const manufacturer = updateRecord ? updateRecord.company || updateRecord.manufacturer : "";
    layout(`
      <section class="panel">
        <div class="section-heading"><div><span class="eyebrow">Supervisor review</span><h1>${escapeHtml(formTitle)}</h1><p class="lead">${escapeHtml(formIntro)}</p></div></div>
        <div id="requestStatus" class="banner request-status"><strong>Put in whatever you know.</strong><br><span>${updateRecord ? "Blanking a field asks the supervisor to remove that detail from the approved product card." : "Partial details are okay. A supervisor will verify the SDS information and approve the record before it is added to the searchable library."}</span></div>
        <form id="addChemicalForm" class="form-grid" novalidate>
          <input type="hidden" name="record_id" value="${fieldValue(updateRecord, "id")}">
          <fieldset class="form-section label-full"><legend>What do you know?</legend><div class="form-section-grid">
            <label class="label">Chemical or product name <input class="field" name="chemical_name" value="${escapeHtml(productName)}" autocomplete="off"></label>
            <label class="label">Product code <input class="field" name="product_code" value="${fieldValue(updateRecord, "product_code")}" autocomplete="off"></label>
            <label class="label">CAS number <input class="field" name="cas_number" value="${fieldValue(updateRecord, "cas_number")}" autocomplete="off"></label>
            <label class="label">Manufacturer / supplier <input class="field" name="manufacturer" value="${escapeHtml(manufacturer)}" autocomplete="off"></label>
          </div></fieldset>
          <fieldset class="form-section label-full"><legend>SDS or safety details</legend><div class="form-section-grid">
            <label class="label">SDS link <input class="field" name="sds_url" type="url" value="${fieldValue(updateRecord, "sds_url")}" autocomplete="off"></label>
            <label class="label">Use / classification <input class="field" name="use" value="${fieldValue(updateRecord, "use")}" autocomplete="off"></label>
            <label class="label">SDS number <input class="field" name="sds_number" value="${fieldValue(updateRecord, "sds_number")}" autocomplete="off"></label>
            <label class="label">SDS version <input class="field" name="sds_version" value="${fieldValue(updateRecord, "sds_version")}" autocomplete="off"></label>
            <label class="label">Issue date <input class="field" name="issue_date" value="${fieldValue(updateRecord, "issue_date")}" autocomplete="off"></label>
            <label class="label">Revision date <input class="field" name="revision_date" value="${fieldValue(updateRecord, "revision_date")}" autocomplete="off"></label>
            <label class="label">Supersedes date <input class="field" name="supersedes_date" value="${fieldValue(updateRecord, "supersedes_date")}" autocomplete="off"></label>
            <label class="label">HFRP / NFPA info <input class="field" name="hfrp_info" value="${fieldValue(updateRecord, "hfrp_info")}" autocomplete="off"></label>
            <label class="label label-full">Composition / active ingredient <textarea class="textarea" name="composition" autocomplete="off">${fieldValue(updateRecord, "composition")}</textarea></label>
          </div></fieldset>
          <fieldset class="form-section label-full"><legend>Requester info</legend><div class="form-section-grid">
            <label class="label">Your email <input class="field" name="requested_by" type="email" autocomplete="email"></label>
            <label class="label label-full">Notes <textarea class="textarea" name="notes" placeholder="Any other additional information for the reviewer"></textarea></label>
          </div></fieldset>
          <div class="form-actions label-full"><button class="button primary" type="submit" id="submitReviewButton">Send for supervisor review</button><button class="button secondary" type="button" data-route="home">Cancel</button></div>
        </form>
      </section>`);
    if (typeof bindButtons === "function") bindButtons();
    const form = document.getElementById("addChemicalForm");
    const status = document.getElementById("requestStatus");
    if (!form) return;
    form.dataset.requestId = makeId();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = document.getElementById("submitReviewButton");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }
      try {
        const { request, result } = await submitForReview(form, status);
        setStatus(status, `<strong>${request.delivery_status === "sent_to_teams" ? "Request sent to Teams review." : "Request saved."}</strong><br><span>${escapeHtml(result.message || "It will appear in ChemicalSearch after approval.")}</span>`, "is-success");
        showSubmissionDialog(request, result.message || "It will appear in ChemicalSearch after approval.");
      } catch (error) {
        setStatus(status, `<strong>Request saved locally, but was not sent.</strong><br><span>${escapeHtml(error.message)} Check the backend connection and try again.</span>`, "is-error");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Send for supervisor review";
        }
      }
    });
  }

  window.renderAddChemical = renderProductionRequestForm;
  window.CHEMICALSEARCH_API_BASE_URL = API_BASE_URL;
  function syncRequestRoute() {
    const [page, id] = location.hash.replace(/^#\/?/, "").split("/");
    if (page === "add-chemical") setTimeout(() => renderProductionRequestForm(id || window.currentQuery || ""), 0);
  }
  window.addEventListener("hashchange", syncRequestRoute);
  syncRequestRoute();
})();
