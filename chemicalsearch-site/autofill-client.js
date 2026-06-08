(() => {
  const DEFAULT_API_BASE_URL = "https://chemicalsearch-backend.onrender.com";
  const API_BASE_URL = (window.CHEMICALSEARCH_API_URL || localStorage.getItem("chemicalsearch.apiBaseUrl") || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const REQUEST_KEY = "chemicalSdsLookup.requests.v1";
  const MIN_TEXT = 4;
  const MIN_URL = 12;
  const TYPE_DELAY = 1600;
  const BLUR_DELAY = 350;
  let timer;
 