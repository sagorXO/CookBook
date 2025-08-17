import { initializeTheme } from './modules/theme.js';
import { createAccordion, setupPantryEventListeners, setupEventListeners, showRecipeDetails } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme
    initializeTheme();

    // 2. Create the ingredient accordion
    createAccordion();

    // 3. Setup event listeners specific to the pantry page
    setupPantryEventListeners();
    
    // 4. Setup general event listeners for recipe cards that will be loaded
    // We need a separate listener here because pantry doesn't use the main.js file
    document.addEventListener('click', async (e) => {
        const recipeCard = e.target.closest('.recipe-card');
        if (recipeCard) {
            // Since pantry doesn't involve user accounts/favorites, we pass a simplified
            // version of showRecipeDetails or handle it within ui.js
            await showRecipeDetails(recipeCard.dataset.id);
        }
    });
});
