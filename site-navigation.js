// Native details provides the menu even when JavaScript is unavailable.
document.addEventListener('click', function (event) {
  document.querySelectorAll('.mobile-menu[open]').forEach(function (menu) {
    if (!menu.contains(event.target) || event.target.closest('.mobile-menu-links a')) {
      menu.open = false;
    }
  });
});
document.addEventListener('keydown', function (event) {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('.mobile-menu[open]').forEach(function (menu) {
    menu.open = false;
    menu.querySelector('summary').focus();
  });
});
