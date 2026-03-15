(function () {
  try {
    var stored = localStorage.getItem('learn-x-theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (stored === 'light') {
      document.documentElement.classList.add('light')
    }
    // 'system' or unset: CSS prefers-color-scheme media query handles it.
  } catch (e) {}
})()
