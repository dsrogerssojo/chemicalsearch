(() => {
  const existing = document.getElementById("sojo-inspired-theme");
  if (existing) existing.remove();

  const style = document.createElement("style");
  style.id = "sojo-inspired-theme";
  style.textContent = `
    :root {
      --sojo-bg: #05070b;
      --sojo-panel: #090d14;
      --sojo-panel-soft: #0d121b;
      --sojo-line: #2f3948;
      --sojo-line-soft: #1e2733;
      --sojo-text: #f7f8fb;
      --sojo-muted: #7e8da0;
      --sojo-muted-2: #aeb9c8;
      --sojo-purple: #d94eff;
      --sojo-shadow: 0 22px 70px rgba(0, 0, 0, .42);
    }

    html, body { background: var(--sojo-bg) !important; color: var(--sojo-text) !important; }
    body { font-family: Inter, Arial, Helvetica, sans-serif !important; }

    .shell {
      background:
        radial-gradient(circle at 90% 2%, rgba(217, 78, 255, .10), transparent 34%),
        linear-gradient(180deg, #05070b 0%, #070a10 100%) !important;
    }

    .topbar { background: rgba(5, 7, 11, .94) !important; border-bottom: 1px solid var(--sojo-line) !important; backdrop-filter: blur(14px) !important; }
    .brand-mark { background: #ffffff !important; color: #05070b !important; border-radius: 10px !important; }
    .brand-title { color: var(--sojo-text) !important; letter-spacing: -.02em !important; }

    .brand-subtitle,.meta,.footer-inner,.summary-list dd,.panel p,.lead,.sort-control { color: var(--sojo-muted-2) !important; }

    .button,.quick-chip,.filter-chip { border-radius: 999px !important; font-weight: 800 !important; transition: transform .16s ease, border-color .16s ease, background .16s ease, color .16s ease !important; }
    .button.primary { background: #ffffff !important; color: #05070b !important; border-color: #ffffff !important; box-shadow: none !important; }
    .button.secondary,.quick-chip,.filter-chip { background: #111721 !important; color: var(--sojo-text) !important; border-color: var(--sojo-line) !important; }
    .button.secondary:hover,.quick-chip:hover,.filter-chip:hover,.filter-chip.is-selected { background: #ffffff !important; color: #05070b !important; border-color: #ffffff !important; }

    .emergency-strip { background: #05070b !important; border-bottom: 1px solid var(--sojo-line) !important; }
    .hotline { background: #111721 !important; color: var(--sojo-text) !important; border-color: var(--sojo-line) !important; border-radius: 10px !important; }
    .hotline.critical { background: #ffffff !important; color: #05070b !important; border-color: #ffffff !important; }

    .hero { background: #05070b !important; border-bottom: 1px solid var(--sojo-line) !important; }
    .hero-inner { padding: 26px 16px 22px !important; }
    .hero .eyebrow { background: transparent !important; color: var(--sojo-purple) !important; padding: 0 !important; border-radius: 0 !important; font-size: .78rem !important; letter-spacing: .08em !important; }
    .hero h1 { color: #ffffff !important; text-transform: uppercase !important; letter-spacing: -.045em !important; font-size: clamp(2rem, 4vw, 4rem) !important; line-height: .92 !important; max-width: 760px !important; margin: 6px 0 12px !important; }
    .hero .lead { color: #ffffff !important; max-width: 720px !important; font-size: 1rem !important; line-height: 1.5 !important; }
    .trust-row { margin-top: 14px !important; gap: 8px !important; }
    .trust-row span { background: #ffffff !important; color: #111827 !important; border: 0 !important; border-radius: 999px !important; padding: 7px 13px !important; font-weight: 700 !important; }

    .main { padding-top: 18px !important; gap: 16px !important; }
    .panel,.search-panel,.incident-card,.chemical-card,.detail-header { background: var(--sojo-panel) !important; border-color: var(--sojo-line) !important; box-shadow: none !important; color: var(--sojo-text) !important; }
    .panel { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; padding: 22px 0 !important; }
    .results-panel,.search-panel { border-radius: 16px !important; border: 1px solid var(--sojo-line) !important; padding: 18px !important; background: rgba(9, 13, 20, .96) !important; }
    .section-heading { border-bottom: 1px solid var(--sojo-line) !important; padding-bottom: 12px !important; margin-bottom: 14px !important; }
    .eyebrow { background: transparent !important; color: var(--sojo-purple) !important; padding: 0 !important; letter-spacing: .08em !important; }
    .panel h1,.panel h2,.panel h3,.chemical-name,.summary-list dt,.label,.detail-title,.incident-card h3 { color: var(--sojo-text) !important; }

    .search-panel .search-row { display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; gap: 12px !important; width: 100% !important; max-width: 100% !important; }
    .search-panel .search-input { order: 1 !important; flex: 1 1 auto !important; width: auto !important; min-width: 0 !important; max-width: none !important; height: 52px !important; }
    .search-panel .search-row .button,.search-panel .search-row button[type='submit'] { order: 2 !important; flex: 0 0 auto !important; width: auto !important; min-width: 128px !important; height: 52px !important; padding: 0 26px !important; }
    .search-input,.field,.textarea,.sort-control select { background: #ffffff !important; color: #101419 !important; border: 1px solid #c8d0da !important; border-radius: 12px !important; }
    .search-input::placeholder,.field::placeholder,.textarea::placeholder { color: #596577 !important; }
    .quick-searches { justify-content: flex-start !important; }
    .filter-toolbar { border-bottom: 1px solid var(--sojo-line-soft) !important; padding-bottom: 12px !important; }

    .chemical-card { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; border-top: 1px solid var(--sojo-line) !important; border-bottom: 0 !important; background: transparent !important; }
    .chemical-card:hover { background: rgba(255,255,255,.035) !important; border-color: var(--sojo-line) !important; }
    .hazard-rail { width: 4px !important; background: var(--sojo-purple) !important; }
    .hazard-high .hazard-rail,.hazard-extreme .hazard-rail { background: #ff4d4d !important; }
    .hazard-moderate .hazard-rail { background: #ffb020 !important; }
    .card-content { padding: 18px 14px !important; }
    .card-preview { color: var(--sojo-muted-2) !important; max-width: 760px !important; }
    .card-footer { color: var(--sojo-muted) !important; }
    .open-label { color: #ffffff !important; }

    .risk-pill,.ghs-pill { border-radius: 999px !important; font-weight: 900 !important; border: 1px solid transparent !important; padding: 4px 9px !important; }
    .risk-low { background:#eaf7ef !important; color:#28784a !important; border-color:#bde5cb !important; }
    .risk-moderate { background:#fff7da !important; color:#9a6500 !important; border-color:#f1d77a !important; }
    .risk-high,.risk-extreme { background:#fff0ed !important; color:#b42318 !important; border-color:#f2b8b0 !important; }
    .ghs-pill { background:#eaf4ff !important; color:#0d4d7d !important; border-color:#b8d7f2 !important; }
    .ghs-flammable { background:#fff0e6 !important; color:#b45309 !important; border-color:#f0c18b !important; }
    .ghs-corrosive { background:#f4e8ff !important; color:#6b21a8 !important; border-color:#d7b7f5 !important; }
    .ghs-oxidizer { background:#e9fbf4 !important; color:#047857 !important; border-color:#a7e6cc !important; }
    .ghs-irritant { background:#fff7d6 !important; color:#92400e !important; border-color:#ecd16f !important; }

    .incident-grid,.sds-section-grid,.hazard-overview { gap: 16px !important; }
    .incident-card,.sds-section-grid .panel,.hazard-overview .panel,.detail-header { border-radius: 16px !important; border: 1px solid var(--sojo-line) !important; background: var(--sojo-panel-soft) !important; padding: 18px !important; }
    .summary-list div { border-bottom-color: var(--sojo-line) !important; }
    .nfpa-cell { border-color: #05070b !important; }
    .footer { background: #05070b !important; border-top: 1px solid var(--sojo-line) !important; }

    @media (max-width: 820px) {
      .hero h1 { font-size: clamp(2rem, 12vw, 3.2rem) !important; }
      .results-panel,.search-panel,.incident-card,.sds-section-grid .panel,.hazard-overview .panel,.detail-header { border-radius: 14px !important; }
      .search-panel .search-row { flex-direction: column !important; align-items: stretch !important; }
      .search-panel .search-input,.search-panel .search-row .button,.search-panel .search-row button[type='submit'] { width: 100% !important; min-width: 0 !important; }
    }
  `;

  document.head.appendChild(style);
})();
