// Phone menu toggle. The layout adds a "js" class to <html> before first paint,
// so the menu starts collapsed with no layout shift. Without JavaScript the
// menu simply shows in full and the button stays hidden.
// No animation: the menu opens and closes instantly (motion budget).
(() => {
  const button = document.querySelector('.menu-button');
  const menu = document.getElementById('site-menu');
  if (!button || !menu) return;
  const set = (open) => {
    button.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      set(false);
      button.focus();
    }
  });
})();
