(() => {
  function moveSdsBadgesIntoMainRow() {
    document.querySelectorAll('.chemical-card').forEach((card) => {
      const mainBadges = card.querySelector('.card-badges');
      const statusRow = card.querySelector('.record-status-row');
      if (!mainBadges || !statusRow) return;

      statusRow.querySelectorAll('.sds-linked, .sds-missing').forEach((badge) => {
        if (!mainBadges.contains(badge)) {
          mainBadges.appendChild(badge);
        }
      });
    });
  }

  window.addEventListener('hashchange', () => {
    window.requestAnimationFrame(moveSdsBadgesIntoMainRow);
  });

  new MutationObserver(() => {
    window.requestAnimationFrame(moveSdsBadgesIntoMainRow);
  }).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

  moveSdsBadgesIntoMainRow();
})();
