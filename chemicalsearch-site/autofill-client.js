(() => {
  const DEFAULT_API_BASE_URL = "https://chemicalsearch-backend.onrender.com";
  const API_BASE_URL = (window.CHEMICALSEARCH_API_URL || localStorage.getItem("chemicalsearch.apiBaseUrl") || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const REQUEST_KEY = "chemicalSdsLookup.requests.v1";
  let timer;
  let lastPayload = "";
  let latestController;

  function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
  }

  function clean(value) {
    return String(value || "").trim