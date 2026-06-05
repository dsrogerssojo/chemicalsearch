const chemicals = [
  {
    name: "Acetone",
    cas: "67-64-1",
    synonyms: ["2-propanone", "dimethyl ketone", "nail polish remover solvent"],
    hazards: ["flammable", "irritant"],
    pictograms: ["🔥", "!"],
    risk: 3,
    updated: "2026-06-04",
    signalWord: "Danger",
    nfpa: { health: 1, fire: 3, reactivity: 0, special: "" },
    uses: "Common laboratory and cleaning solvent.",
    symptoms: "Eye irritation, dry skin, headache, dizziness, and drowsiness after high vapor exposure.",
    ppe: "Splash goggles, nitrile gloves, ventilation, and flame-resistant storage controls.",
    firstAid: {
      skin: "Remove contaminated clothing and wash skin with soap and water.",
      eyes: "Rinse cautiously with water for several minutes. Remove contacts if easy to do.",
      inhalation: "Move person to fresh air and monitor breathing.",
      ingestion: "Rinse mouth. Do not induce vomiting unless directed by medical personnel."
    },
    handling: "Keep away from ignition sources. Use only with adequate ventilation. Ground and bond containers during transfer.",
    storage: "Store in a flammable liquids cabinet with container tightly closed.",
    controls: "Use local exhaust ventilation and avoid open flames, sparks, and hot surfaces.",
    spill: "Eliminate ignition sources, ventilate area, absorb with inert material, and place waste in approved container."
  },
  {
    name: "Hydrochloric Acid",
    cas: "7647-01-0",
    synonyms: ["muriatic acid", "hydrogen chloride solution", "HCl"],
    hazards: ["corrosive", "irritant"],
    pictograms: ["🧪", "!"],
    risk: 4,
    updated: "2026-06-03",
    signalWord: "Danger",
    nfpa: { health: 3, fire: 0, reactivity: 1, special: "ACID" },
    uses: "Acidification, pH adjustment, cleaning, and laboratory reagent use.",
    symptoms: "Severe skin and eye burns, coughing, throat irritation, and breathing difficulty from vapors or mist.",
    ppe: "Chemical splash goggles, face shield, acid-resistant gloves, apron, and ventilation.",
    firstAid: {
      skin: "Immediately flush skin with water for at least 15 minutes and remove contaminated clothing.",
      eyes: "Rinse eyes with water for at least 15 minutes and seek urgent medical attention.",
      inhalation: "Move to fresh air. Seek medical attention if coughing, wheezing, or breathing difficulty occurs.",
      ingestion: "Rinse mouth. Do not induce vomiting. Seek immediate medical assistance."
    },
    handling: "Add acid to water, never water to acid. Avoid inhaling vapors and prevent contact with metals.",
    storage: "Store in corrosives cabinet away from bases, oxidizers, and reactive metals.",
    controls: "Use in a fume hood or well-ventilated area with eyewash and shower nearby.",
    spill: "Evacuate nonessential personnel, neutralize only if trained, and contain with compatible absorbent."
  },
  {
    name: "Benzene",
    cas: "71-43-2",
    synonyms: ["benzol", "cyclohexatriene", "aromatic hydrocarbon"],
    hazards: ["flammable", "toxic"],
    pictograms: ["🔥", "☠"],
    risk: 5,
    updated: "2026-06-02",
    signalWord: "Danger",
    nfpa: { health: 2, fire: 3, reactivity: 0, special: "" },
    uses: "Industrial chemical intermediate and restricted laboratory solvent.",
    symptoms: "Drowsiness, dizziness, headache, skin irritation, and serious chronic health concerns from repeated exposure.",
    ppe: "Certified respirator when required, chemical gloves, goggles, closed system handling, and strict ventilation.",
    firstAid: {
      skin: "Remove contaminated clothing and wash thoroughly with soap and water.",
      eyes: "Rinse eyes with water for several minutes and seek medical evaluation.",
      inhalation: "Move to fresh air immediately and obtain medical attention.",
      ingestion: "Do not induce vomiting. Seek immediate medical attention."
    },
    handling: "Use closed containers, avoid vapor generation, and keep away from ignition sources.",
    storage: "Store in approved flammable storage away from oxidizers with secondary containment.",
    controls: "Use closed systems, local exhaust, exposure monitoring, and restricted access procedures.",
    spill: "Evacuate, remove ignition sources, use trained response personnel, and collect with non-sparking tools."
  },
  {
    name: "Ammonia Solution",
    cas: "1336-21-6",
    synonyms: ["ammonium hydroxide", "aqueous ammonia", "NH4OH"],
    hazards: ["irritant", "corrosive"],
    pictograms: ["!", "🧪"],
    risk: 3,
    updated: "2026-05-29",
    signalWord: "Warning",
    nfpa: { health: 3, fire: 1, reactivity: 0, special: "ALK" },
    uses: "Cleaning, pH adjustment, and laboratory reagent use.",
    symptoms: "Eye watering, coughing, throat irritation, skin irritation, and possible burns at higher concentrations.",
    ppe: "Goggles, compatible gloves, lab coat or apron, and strong ventilation.",
    firstAid: {
      skin: "Flush affected skin with water and remove contaminated clothing.",
      eyes: "Flush eyes continuously with water and seek medical attention.",
      inhalation: "Move to fresh air and get medical help if symptoms persist.",
      ingestion: "Rinse mouth and seek medical guidance. Do not induce vomiting."
    },
    handling: "Avoid breathing vapors. Open containers slowly and use in ventilated areas.",
    storage: "Keep tightly closed in a cool area away from acids and oxidizers.",
    controls: "Use local exhaust and keep eyewash available.",
    spill: "Ventilate, avoid inhalation, contain liquid, and absorb with compatible material."
  },
  {
    name: "Hydrogen Peroxide 30%",
    cas: "7722-84-1",
    synonyms: ["peroxide", "H2O2", "high strength peroxide"],
    hazards: ["oxidizer", "corrosive"],
    pictograms: ["⭕", "🧪"],
    risk: 4,
    updated: "2026-05-27",
    signalWord: "Danger",
    nfpa: { health: 3, fire: 0, reactivity: 1, special: "OX" },
    uses: "Oxidizing agent, disinfection, bleaching, and laboratory reagent use.",
    symptoms: "Skin whitening or burns, eye damage, irritation, and respiratory discomfort from mist.",
    ppe: "Splash goggles, face shield, compatible gloves, lab coat, and dedicated secondary containment.",
    firstAid: {
      skin: "Flush skin with water and remove contaminated clothing.",
      eyes: "Flush eyes for at least 15 minutes and seek urgent medical attention.",
      inhalation: "Move to fresh air and seek medical attention if irritation occurs.",
      ingestion: "Rinse mouth. Do not induce vomiting. Seek immediate medical attention."
    },
    handling: "Keep away from organic material, metals, heat, and contamination. Do not return unused material to original container.",
    storage: "Store vented container upright in cool area away from combustibles and reducers.",
    controls: "Use splash protection and avoid incompatible materials.",
    spill: "Dilute cautiously with large amounts of water only if trained and safe to do so. Keep combustibles away."
  }
];

const routeGuidance = {
  skin: {
    title: "Skin contact",
    steps: [
      "Remove contaminated clothing and jewelry.",
      "Flush affected skin with water for at least 15 minutes when irritation or burns are possible.",
      "Do not reuse contaminated clothing until cleaned or disposed of safely.",
      "Escalate for burns, pain, spreading irritation, or unknown materials."
    ]
  },
  eyes: {
    title: "Eye exposure",
    steps: [
      "Begin rinsing immediately with clean running water or eyewash.",
      "Hold eyelids open and continue rinsing for at least 15 minutes.",
      "Remove contact lenses only if easy to do.",
      "Seek urgent medical attention for pain, blurred vision, corrosives, or unknown chemicals."
    ]
  },
  inhalation: {
    title: "Inhalation",
    steps: [
      "Move the person to fresh air without entering an unsafe area yourself.",
      "Loosen tight clothing and monitor breathing.",
      "Call emergency services for breathing difficulty, unconsciousness, chest pain, or toxic gas exposure.",
      "Do not re-enter the area until it is cleared by trained personnel."
    ]
  },
  ingestion: {
    title: "Ingestion",
    steps: [
      "Rinse mouth if the person is awake and alert.",
      "Do not induce vomiting unless directed by poison control or medical personnel.",
      "Keep the container or label available for responders.",
      "Seek immediate guidance for corrosive, toxic, unknown, or large quantity exposures."
    ]
  }
};

const grid = document.getElementById("chemicalGrid");
const search = document.getElementById("chemicalSearch");
const count = document.getElementById("resultCount");
const empty = document.getElementById("emptyState");
const detailPanel = document.getElementById("detailPanel");
const sortRecords = document.getElementById("sortRecords");
const resetSearch = document.getElementById("resetSearch");
const metricRecords = document.getElementById("metricRecords");
const routeGuidanceEl = document.getElementById("routeGuidance");
const intakeForm = document.getElementById("intakeForm");
const intakeOutput = document.getElementById("intakeOutput");
const printRecord = document.getElementById("printRecord");

let activeFilter = "all";
let selectedChemical = chemicals[0];

metricRecords.textContent = chemicals.length;

function searchableText(chemical) {
  return [
    chemical.name,
    chemical.cas,
    chemical.signalWord,
    chemical.uses,
    chemical.symptoms,
    chemical.ppe,
    chemical.handling,
    chemical.storage,
    chemical.controls,
    chemical.spill,
    ...chemical.synonyms,
    ...chemical.hazards,
    ...Object.values(chemical.firstAid)
  ]
    .join(" ")
    .toLowerCase();
}

function sortData(data) {
  const sortValue = sortRecords.value;
  return [...data].sort((a, b) => {
    if (sortValue === "risk") return b.risk - a.risk || a.name.localeCompare(b.name);
    if (sortValue === "updated") return new Date(b.updated) - new Date(a.updated);
    return a.name.localeCompare(b.name);
  });
}

function renderBadges(chemical) {
  return chemical.hazards.map((hazard) => `<span class="badge ${hazard}">${hazard}</span>`).join("");
}

function renderPictograms(chemical) {
  return chemical.pictograms.map((icon) => `<span class="pictogram"><span>${icon}</span></span>`).join("");
}

function renderGrid() {
  const query = search.value.trim().toLowerCase();
  const filtered = chemicals.filter((chemical) => {
    const matchesFilter = activeFilter === "all" || chemical.hazards.includes(activeFilter);
    const matchesSearch = !query || searchableText(chemical).includes(query);
    return matchesFilter && matchesSearch;
  });

  const data = sortData(filtered);
  grid.innerHTML = "";
  count.textContent = `${data.length} record${data.length === 1 ? "" : "s"}`;
  empty.hidden = data.length !== 0;

  data.forEach((chemical) => {
    const card = document.createElement("article");
    card.className = `chemical-card ${chemical.cas === selectedChemical.cas ? "selected" : ""}`;
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${chemical.name}</h3>
          <div class="cas">CAS ${chemical.cas}</div>
        </div>
        <strong>${chemical.signalWord}</strong>
      </div>
      <div class="badge-row">${renderBadges(chemical)}</div>
      <div class="pictogram-row" aria-label="GHS-style pictograms">${renderPictograms(chemical)}</div>
      <div class="card-meta">
        <span><strong>Symptoms:</strong> ${chemical.symptoms}</span>
        <span><strong>PPE:</strong> ${chemical.ppe}</span>
      </div>
      <span class="card-action">Open SDS-style record →</span>
    `;
    card.addEventListener("click", () => selectChemical(chemical));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") selectChemical(chemical);
    });
    grid.appendChild(card);
  });
}

function renderDetail(chemical) {
  const firstAidItems = Object.entries(chemical.firstAid)
    .map(([route, text]) => `<li><strong>${route}:</strong> ${text}</li>`)
    .join("");

  detailPanel.innerHTML = `
    <div class="detail-hero">
      <div class="detail-title">
        <div class="badge-row">${renderBadges(chemical)}</div>
        <h3>${chemical.name}</h3>
        <p class="cas">CAS ${chemical.cas} · Signal word: ${chemical.signalWord} · Updated ${chemical.updated}</p>
        <p class="synonyms"><strong>Synonyms:</strong> ${chemical.synonyms.join(", ")}</p>
        <p>${chemical.uses}</p>
        <div class="pictogram-row">${renderPictograms(chemical)}</div>
      </div>
      <div aria-label="NFPA-style rating diamond">
        <div class="nfpa-diamond">
          <div class="nfpa-cell nfpa-health"><span>${chemical.nfpa.health}</span></div>
          <div class="nfpa-cell nfpa-fire"><span>${chemical.nfpa.fire}</span></div>
          <div class="nfpa-cell nfpa-reactivity"><span>${chemical.nfpa.reactivity}</span></div>
          <div class="nfpa-cell nfpa-special"><span>${chemical.nfpa.special || "—"}</span></div>
        </div>
      </div>
    </div>
    <div class="sds-grid">
      <section class="sds-section"><h4>Section 1: Identification</h4><p>${chemical.name}, CAS ${chemical.cas}. Synonyms include ${chemical.synonyms.join(", ")}.</p></section>
      <section class="sds-section"><h4>Section 2: Hazard identification</h4><p>${chemical.signalWord}. Main classifications: ${chemical.hazards.join(", ")}.</p></section>
      <section class="sds-section"><h4>Section 3: Symptoms</h4><p>${chemical.symptoms}</p></section>
      <section class="sds-section"><h4>Section 4: First aid</h4><ul>${firstAidItems}</ul></section>
      <section class="sds-section"><h4>Section 5: Fire and spill response</h4><p>${chemical.spill}</p></section>
      <section class="sds-section"><h4>Section 6: Handling</h4><p>${chemical.handling}</p></section>
      <section class="sds-section"><h4>Section 7: Storage</h4><p>${chemical.storage}</p></section>
      <section class="sds-section"><h4>Section 8: PPE and controls</h4><p><strong>PPE:</strong> ${chemical.ppe}</p><p><strong>Controls:</strong> ${chemical.controls}</p></section>
    </div>
  `;
}

function selectChemical(chemical) {
  selectedChemical = chemical;
  renderDetail(chemical);
  renderGrid();
  document.getElementById("sds-view").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRoute(route) {
  const guidance = routeGuidance[route];
  routeGuidanceEl.innerHTML = `
    <strong>${guidance.title}</strong>
    <ul>${guidance.steps.map((step) => `<li>${step}</li>`).join("")}</ul>
  `;
}

search.addEventListener("input", renderGrid);
sortRecords.addEventListener("change", renderGrid);
resetSearch.addEventListener("click", () => {
  search.value = "";
  sortRecords.value = "name";
  activeFilter = "all";
  document.querySelectorAll(".filter-pill").forEach((button) => button.classList.toggle("active", button.dataset.filter === "all"));
  renderGrid();
});

document.querySelectorAll(".filter-pill").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderGrid();
  });
});

document.querySelectorAll(".route-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".route-tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderRoute(button.dataset.route);
  });
});

intakeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(intakeForm);
  const name = data.get("name") || "Unknown chemical";
  const cas = data.get("cas") || "CAS not provided";
  const route = data.get("route");
  const notes = data.get("notes") || "No notes provided";
  intakeOutput.hidden = false;
  intakeOutput.textContent = `Intake summary\nChemical: ${name}\nCAS: ${cas}\nExposure route: ${route}\nNotes: ${notes}\n\nSuggested routing: verify against official SDS/manufacturer record, then flag for safety review before adding to production.`;
});

printRecord.addEventListener("click", () => window.print());

renderRoute("skin");
renderDetail(selectedChemical);
renderGrid();
