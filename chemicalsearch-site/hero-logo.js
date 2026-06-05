(() => {
  function installHeroLogoStyles() {
    if (document.getElementById('hero-logo-direct-styles')) return;
    const style = document.createElement('style');
    style.id = 'hero-logo-direct-styles';
    style.textContent = `
      .hero-inner {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(220px, 360px) !important;
        align-items: center !important;
        gap: 48px !important;
      }

      .hero-inner::after {
        display: none !important;
        content: none !important;
      }

      .hero-logo-panel {
        justify-self: end !important;
        align-self: center !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 220px !important;
      }

      .hero-logo-panel img {
        display: block !important;
        width: min(320px, 28vw) !important;
        max-width: 100% !important;
        height: auto !important;
        object-fit: contain !important;
      }

      @media (max-width: 900px) {
        .hero-inner {
          grid-template-columns: 1fr !important;
          gap: 22px !important;
        }
        .hero-logo-panel {
          justify-self: start !important;
          min-width: 0 !important;
        }
        .hero-logo-panel img {
          width: 180px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function insertHeroLogo() {
    installHeroLogoStyles();
    const heroInner = document.querySelector('.hero-inner');
    if (!heroInner || heroInner.querySelector('.hero-logo-panel')) return;

    const panel = document.createElement('div');
    panel.className = 'hero-logo-panel';

    const img = document.createElement('img');
    img.src = 'assets/sojo-logo.svg';
    img.alt = 'SOJO';
    img.loading = 'eager';

    panel.appendChild(img);
    heroInner.appendChild(panel);
  }

  insertHeroLogo();
  new MutationObserver(insertHeroLogo).observe(document.body, { childList: true, subtree: true });
})();
