// --- API & State ---
const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1/';

/**
 * Toggles the visibility of the loading spinner.
 * @param {boolean} show - True to show the spinner, false to hide.
 */
const toggleSpinner = (show) => {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.toggle('d-none', !show);
    }
};

/**
 * Fetches data from TheMealDB API.
 * @param {string} endpoint - The API endpoint to fetch from.
 * @returns {Promise<Array|null>} - A promise that resolves to an array of meals or null if an error occurs.
 */
export const fetchAPI = async (endpoint) => {
    toggleSpinner(true);
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data.meals;
    } catch (error) {
        console.error('API Fetch Error:', error);
        const recipeResults = document.getElementById('recipe-results') || document.getElementById('pantry-recipe-results');
        if (recipeResults) {
            recipeResults.innerHTML = `<p class="text-center text-danger">Could not fetch recipes. Please try again later.</p>`;
        }
        return null;
    } finally {
        toggleSpinner(false);
    }
};

/**
 * Fetches recipes based on a list of ingredients.
 * TheMealDB API can only filter by one main ingredient at a time.
 * This function fetches for the first ingredient and then you would typically
 * filter further on the client side if needed.
 * @param {string[]} ingredients - An array of ingredient strings.
 * @returns {Promise<Array|null>} - A promise that resolves to an array of meals.
 */
export const fetchRecipesByIngredients = async (ingredients) => {
    if (!ingredients || ingredients.length === 0) {
        return [];
    }
    // The API's multi-ingredient search is not effective. We'll use the first ingredient
    // as the primary filter, which is the most common use case.
    const primaryIngredient = ingredients[0];
    return await fetchAPI(`filter.php?i=${primaryIngredient}`);
};
