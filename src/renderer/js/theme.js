// src/renderer/js/theme.js

function applyTheme(theme) {
  const app = document.getElementById('app');
  if (!app) return;

  const themeClasses = [
    'theme-dark', 'theme-blue', 'theme-green', 'theme-brown',
    'theme-gold', 'theme-pink', 'theme-purple', 'theme-emerald',
    'theme-ocean', 'theme-royal', 'theme-indigo', 'theme-classic', 'theme-navy'
  ];
  app.classList.remove(...themeClasses);
  app.classList.add(`theme-${theme}`);
}

module.exports = { applyTheme };
