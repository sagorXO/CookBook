import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { auth } from './modules/firebase.js';
import { initializeTheme } from './modules/theme.js';
import { setupAuthUI, handleAuth } from './modules/auth.js';
import { fetchAPI } from './modules/api.js';
import { displayRecipes, setupEventListeners } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- INITIALIZATION ---

    // 1. Initialize Theme (Dark/Light Mode)
    initializeTheme();

    // 2. Setup Global Event Listeners (for non-auth elements)
    // This now handles the accessible recipe card clicks globally.
    setupEventListeners();
    handleAuth(); // Sets up listeners for login form, etc.

    // 3. Listen for Authentication State Changes
    const authContainer = document.getElementById('auth-container');
    onAuthStateChanged(auth, user => {
        // This function runs whenever the user logs in or out.
        // It's the central point for updating the UI based on auth state.
        setupAuthUI(authContainer, user);
    });


    // 4. Initial Recipe Load (for all visitors)
    const loadInitialRecipes = async () => {
        const resultsTitle = document.getElementById('results-title');
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');

        let meals;
        if (searchQuery) {
            const searchInput = document.getElementById('search-input');
            const searchClearBtn = document.getElementById('search-clear-btn');
            if(searchInput) searchInput.value = searchQuery;
            if(searchClearBtn) searchClearBtn.classList.remove('d-none');

            resultsTitle.textContent = `Search Results for "${searchQuery}"`;
            meals = await fetchAPI(`search.php?s=${searchQuery}`);
        } else {
            resultsTitle.textContent = "🔥 Trending Now";
            meals = await fetchAPI('filter.php?c=Seafood');
        }
        // The global `allMeals` variable is set in ui.js, but we need to assign it here for filtering
        window.allMeals = meals || []; 
        displayRecipes(meals, 'recipe-results');
    };

    loadInitialRecipes();
});