(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const storedTheme = localStorage.getItem('bankops-theme');
  const preferredTheme = 'light';

  const setTheme = theme => {
    root.dataset.theme = theme;
    localStorage.setItem('bankops-theme', theme);
    if (toggle) {
      toggle.textContent = theme === 'light' ? '☾' : '☀';
      toggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
    }
  };

  setTheme(storedTheme || preferredTheme);
  if (toggle) toggle.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));
})();
