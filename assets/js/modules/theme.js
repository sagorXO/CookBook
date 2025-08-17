/**
 * Applies the specified theme to the body and browser header.
 * @param {string} theme - The theme to apply ('dark' or 'light').
 */
function applyTheme(theme) {
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    if (theme === 'dark') {
        body.classList.add('dark-mode');
        themeToggleBtn.classList.replace('bi-moon-stars-fill', 'bi-sun-fill');
        themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', '#1a252f'); // Dark mode background
        }
    } else {
        body.classList.remove('dark-mode');
        themeToggleBtn.classList.replace('bi-sun-fill', 'bi-moon-stars-fill');
        themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', '#FFFDF5'); // Light mode background
        }
    }
}

/**
 * Toggles the theme between light and dark.
 */
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
}

/**
 * Initializes the theme based on user preference or system settings.
 */
export function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
}
