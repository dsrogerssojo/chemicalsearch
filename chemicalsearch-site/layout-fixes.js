(function () {
  var SOJO_LOGO_URL = 'https://techcouncilventures.com/wp-content/uploads/2023/10/Sojo-Logo.png';
  var fixing = false;
  var homeButton = document.getElementById('homeButton');

  function routeName() {
    return location.hash.replace(/^#\/?/, '').split('/')[0];
  }

  function syncHomeButton() {
    var isHome = !routeName();
    document.body.classList.toggle('is-home-page', isHome);
    document.querySelectorAll('.home-button-fixed').forEach(function (node) {
      node.remove();
    });
    if (homeButton) homeButton.hidden = isHome;
  }

  if (homeButton) {
    homeButton.addEventListener('click', function () {
      location.hash = '#/';
      syncHomeButton();
      setTimeout(function () {
        window.scrollTo(0, 0);
      }, 0);
    });
  }

  function createHeroLogoPanel() {
    var panel = document.createElement('div');
    panel.className = 'hero-logo-panel';

    var img = document.createElement('img');
    img.src = SOJO_LOGO_URL;
    img.alt = 'SOJO';
    img.loading = 'eager';

    panel.appendChild(img);
    return panel;
  }

  function fixHeroLogo() {
    if (fixing) return;
    fixing = true;
    try {
      syncHomeButton();
      var hero = document.querySelector('.hero-inner');
      if (!hero) return;

      var panels = Array.from(hero.querySelectorAll('.hero-logo-panel'));
      var primaryPanel = panels[0];

      panels.slice(1).forEach(function (node) {
        node.remove();
      });

      if (!primaryPanel) {
        hero.appendChild(createHeroLogoPanel());
        return;
      }

      var img = primaryPanel.querySelector('img');
      if (!img) {
        primaryPanel.replaceWith(createHeroLogoPanel());
        return;
      }

      if (img.src !== SOJO_LOGO_URL) img.src = SOJO_LOGO_URL;
      if (img.alt !== 'SOJO') img.alt = 'SOJO';
      if (img.loading !== 'eager') img.loading = 'eager';
    } finally {
      fixing = false;
    }
  }

  syncHomeButton();
  fixHeroLogo();
  window.addEventListener('hashchange', syncHomeButton);
  new MutationObserver(function () {
    window.requestAnimationFrame(fixHeroLogo);
  }).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
})();
