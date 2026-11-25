(() => {
  let storedTheme;
  try {
    storedTheme = localStorage.getItem('greytest.theme');
  } catch {
    storedTheme = null;
  }
  const theme = storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
