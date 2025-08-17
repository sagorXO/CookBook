import { initializeTheme } from './modules/theme.js';
import { createAccordion, setupPantryEventListeners, showRecipeDetails } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme
    initializeTheme();

    // 2. Create the ingredient accordion
    createAccordion();

    // 3. Setup event listeners specific to the pantry page
    setupPantryEventListeners();
    
    // 4. Setup general event listeners for recipe cards that will be loaded
    // This uses the improved event delegation from ui.js
    document.addEventListener('click', async (e) => {
        const recipeTarget = e.target.closest('.view-recipe-btn, .recipe-title-link');
        if (recipeTarget) {
            await showRecipeDetails(recipeTarget.dataset.id);
        }
    });
});