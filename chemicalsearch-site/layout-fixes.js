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

  function fixHeroLogo() {
    if (fixing) return;
    fixing = true;
    try {
      syncHomeButton();
      var hero = document.querySelector('.hero-inner');
      if (!hero) return;

      hero.querySelectorAll('.hero-logo-panel').forEach(function (node) {
        node.remove();
      });

      var panel = document.createElement('div');
      panel.className = 'hero-logo-panel';

      var img = document.createElement('img');
      img.src = SOJO_LOGO_URL;
      img.alt = 'SOJO';
      img.loading = 'eager';

      panel.appendChild(img);
      hero.appendChild(panel);
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
