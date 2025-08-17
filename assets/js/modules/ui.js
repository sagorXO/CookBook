import { fetchAPI, fetchRecipesByIngredients } from './api.js';
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";


// --- State ---
let currentRecipeId = null;
let currentFilters = {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    maxTime: 120,
    sort: 'default'
};
let allMeals = []; // To store the full list of meals for client-side filtering

const haramIngredients = ['pork', 'bacon', 'ham', 'lard', 'wine', 'beer', 'alcohol', 'vodka', 'gin', 'rum', 'brandy', 'sake', 'prosciutto'];
const halalSubstitutes = {
    'pork': 'Beef, Lamb, or Chicken', 'bacon': 'Beef or Turkey Bacon', 'ham': 'Smoked Turkey or Beef',
    'lard': 'Vegetable Shortening or Butter', 'wine': 'Non-alcoholic Wine or Broth', 'beer': 'Non-alcoholic Beer or Chicken Broth',
    'alcohol': 'Non-alcoholic Vanilla Extract', 'prosciutto': 'Smoked Beef or Turkey'
};

// --- Helper Functions ---

/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
export function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0 show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Auto-dismiss the toast
    setTimeout(() => {
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.hide();
        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }, 3000);
}


// --- UI Display Functions ---

/**
 * Displays recipes in a specified container.
 * @param {Array} meals - An array of meal objects to display.
 * @param {string} containerId - The ID of the container element.
 */
export function displayRecipes(meals, containerId) {
    const containerEl = document.getElementById(containerId);
    if (!containerEl) return;

    // **FIX: Inefficient DOM Manipulation**
    // Build the entire HTML string first, then set innerHTML once.
    let cardsHTML = '';
    if (!meals || meals.length === 0) {
        containerEl.innerHTML = `<p class="text-center col-12">No recipes found. Try another search! 🧐</p>`;
        return;
    }

    meals.forEach(meal => {
        cardsHTML += `
            <div class="col-md-4 col-lg-3">
                <div class="card recipe-card h-100" data-id="${meal.idMeal}" tabindex="0" role="button" aria-label="View recipe for ${meal.strMeal}">
                    <img src="${meal.strMealThumb || 'https://via.placeholder.com/300x200.png?text=No+Image'}" class="card-img-top" alt="${meal.strMeal}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${meal.strMeal}</h5>
                        <button class="btn btn-primary mt-auto" aria-hidden="true">View Recipe</button>
                    </div>
                </div>
            </div>`;
    });
    containerEl.innerHTML = cardsHTML;
}

/**
 * Displays the details of a specific recipe in a modal.
 * @param {object} meal - The meal object containing recipe details.
 */
async function displayModalContent(meal) {
    const recipeModal = new bootstrap.Modal(document.getElementById('recipeModal'));
    currentRecipeId = meal.idMeal;
    let ingredientsHTML = '';
    let isHaram = false;

    const getSubstitute = (ing) => {
        const lowerIng = ing.toLowerCase();
        for (const key in halalSubstitutes) {
            if (new RegExp(`\\b${key}\\b`, 'i').test(lowerIng)) return halalSubstitutes[key];
        }
        return 'Check for certified halal alternatives.';
    };

    const ingredients = meal.ingredients || [];
    if (ingredients.length === 0) {
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            if (ingredient) {
                ingredients.push({ name: ingredient, measure: meal[`strMeasure${i}`] });
            } else {
                break;
            }
        }
    }

    ingredients.forEach(({ name, measure }) => {
        // **FIX: Fragile Ingredient Matching**
        // Use regex with word boundaries for a more accurate match.
        const isIngredientHaram = haramIngredients.some(term => new RegExp(`\\b${term}\\b`, 'i').test(name));
        if (isIngredientHaram) {
            isHaram = true;
            const substitute = getSubstitute(name);
            ingredientsHTML += `<li><span class="haram-ingredient" title="${substitute}">${name}</span> - <span class="text-muted">${measure || ''}</span><div class="substitute-suggestion"><strong>Substitute:</strong> ${substitute}</div></li>`;
        } else {
            ingredientsHTML += `<li>${name} - <span class="text-muted">${measure || ''}</span></li>`;
        }
    });

    const halalStatus = isHaram ? `<span class="halal-status haram">Contains Haram Ingredients</span>` : `<span class="halal-status halal">Halal</span>`;
    const modalBody = document.getElementById('recipeModalBody');
    modalBody.innerHTML = `
        <h2 class="modal-title mb-3">${meal.strMeal}</h2>
        <div class="row">
            <div class="col-md-5">
                <img src="${meal.strMealThumb}" class="img-fluid rounded mb-3" alt="${meal.strMeal}">
                <p><strong>Category:</strong> ${meal.strCategory || 'Custom'}</p>
                <p><strong>Cuisine:</strong> ${meal.strArea || 'Custom'}</p>
                ${halalStatus}
            </div>
            <div class="col-md-7">
                <h3>Ingredients</h3>
                <ul class="list-unstyled">${ingredientsHTML}</ul>
            </div>
        </div>
        <hr>
        <h3>Instructions</h3>
        <p style="white-space: pre-wrap;">${meal.strInstructions}</p>
        ${meal.strYoutube ? `<div class="mt-4"><h3>Video Tutorial</h3><div class="ratio ratio-16x9"><iframe src="https://www.youtube.com/embed/${meal.strYoutube.slice(-11)}" allowfullscreen class="rounded" title="YouTube video player for ${meal.strMeal}"></iframe></div></div>` : ''}`;

    await updateFavoriteButton();
    recipeModal.show();
}

/**
 * Fetches and shows the details for a given meal ID.
 * @param {string} mealId - The ID of the meal to show.
 */
export async function showRecipeDetails(mealId) {
    // Check if it's a user recipe or a favorite from our optimized store
    const user = auth.currentUser;
    if (user) {
        const userData = await getUserData(user.uid);
        const allUserMeals = [...(userData.userRecipes || []), ...(userData.favorites || [])];
        const meal = allUserMeals.find(r => r.idMeal === mealId);
        if (meal) {
            await displayModalContent(meal);
            return;
        }
    }
    
    // Fallback to API for public recipes
    const meals = await fetchAPI(`lookup.php?i=${mealId}`);
    if (meals) await displayModalContent(meals[0]);
}

/**
 * Updates the text and style of the favorite button based on the current user's data.
 */
async function updateFavoriteButton() {
    const favoriteBtn = document.getElementById('favorite-btn');
    const user = auth.currentUser;

    if (!user) {
        favoriteBtn.classList.add('d-none');
        return;
    }
    
    const userData = await getUserData(user.uid);
    const favorites = userData.favorites || [];
    favoriteBtn.classList.remove('d-none');
    favoriteBtn.classList.toggle('d-none', String(currentRecipeId).startsWith('user_'));

    if (favorites.some(fav => fav.idMeal === currentRecipeId)) {
        favoriteBtn.textContent = 'Remove from Favorites';
        favoriteBtn.classList.replace('btn-warning', 'btn-danger');
    } else {
        favoriteBtn.textContent = 'Add to Favorites';
        favoriteBtn.classList.replace('btn-danger', 'btn-warning');
    }
}


// --- Firestore Data Functions ---

/**
 * Retrieves user data (favorites and recipes) from Firestore.
 * @param {string} uid - The user's unique ID.
 * @returns {Promise<object>} - A promise that resolves to the user's data object.
 */
const getUserData = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        // Create document for new user
        const newUserDoc = { favorites: [], userRecipes: [] };
        await setDoc(docRef, newUserDoc);
        return newUserDoc;
    }
};

/**
 * Toggles a recipe's favorite status in Firestore.
 */
async function toggleFavorite() {
    const user = auth.currentUser;
    if (!user || !currentRecipeId) return;

    const userDocRef = doc(db, "users", user.uid);
    const userData = await getUserData(user.uid);
    const favorites = userData.favorites || [];
    const isFavorited = favorites.some(fav => fav.idMeal === currentRecipeId);

    if (isFavorited) {
        // **FIX: Critical Performance Bottleneck**
        // Remove the entire meal object instead of just the ID.
        const recipeToRemove = favorites.find(fav => fav.idMeal === currentRecipeId);
        await updateDoc(userDocRef, { favorites: arrayRemove(recipeToRemove) });
        showToast('💔 Recipe removed from favorites!', 'error');
    } else {
        // **FIX: Critical Performance Bottleneck**
        // Fetch and store the entire meal object.
        const meals = await fetchAPI(`lookup.php?i=${currentRecipeId}`);
        if (meals && meals[0]) {
            await updateDoc(userDocRef, { favorites: arrayUnion(meals[0]) });
            showToast('⭐ Recipe added to favorites!');
        }
    }

    await updateFavoriteButton();
    await loadFavorites(user.uid);
}


/**
 * Loads and displays the user's favorite recipes from Firestore.
 * @param {string} uid - The user's unique ID.
 */
export async function loadFavorites(uid) {
    const favSection = document.getElementById('favorites-section');
    if (!uid || !favSection) return;

    // **FIX: Critical Performance Bottleneck**
    // Now reads the full meal objects directly from Firestore, avoiding N+1 API calls.
    const userData = await getUserData(uid);
    const favs = userData.favorites || [];

    if (favs.length === 0) {
        favSection.classList.add('d-none');
        return;
    }

    favSection.classList.remove('d-none');
    displayRecipes(favs, 'favorites-container');
}

/**
 * Loads and displays the user's own recipes from Firestore.
 * @param {string} uid - The user's unique ID.
 */
export async function loadUserRecipes(uid) {
    const myRecipesSection = document.getElementById('my-recipes-section');
    if (!uid || !myRecipesSection) return;

    const userData = await getUserData(uid);
    const userRecipes = userData.userRecipes || [];
    if (userRecipes.length === 0) {
        myRecipesSection.classList.add('d-none');
        return;
    }
    myRecipesSection.classList.remove('d-none');
    displayRecipes(userRecipes, 'my-recipes-container');
}

/**
 * Handles saving a new user-created recipe to Firestore.
 * @param {Event} e - The form submission event.
 */
async function handleSaveRecipe(e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    // **ENHANCEMENT: Dynamic Ingredient Inputs**
    // Read from the new dynamic input fields.
    const ingredients = Array.from(document.querySelectorAll('.ingredient-item')).map(item => {
        const name = item.querySelector('input[name="ingredientName"]').value;
        const measure = item.querySelector('input[name="ingredientMeasure"]').value;
        return { name, measure };
    }).filter(ing => ing.name.trim() !== '');

    const newRecipe = {
        idMeal: `user_${Date.now()}`,
        strMeal: document.getElementById('recipe-title').value,
        strMealThumb: document.getElementById('recipe-image-url').value || 'https://via.placeholder.com/300x200.png?text=No+Image',
        strInstructions: document.getElementById('recipe-instructions').value,
        ingredients: ingredients,
    };

    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { userRecipes: arrayUnion(newRecipe) });

    e.target.reset();
    document.getElementById('ingredients-list').innerHTML = ''; // Clear dynamic fields
    addIngredientField(); // Add one back for the next time
    const addRecipeModal = bootstrap.Modal.getInstance(document.getElementById('addRecipeModal'));
    addRecipeModal.hide();
    await loadUserRecipes(user.uid);
    showToast('🎉 Recipe saved successfully!');
}

/**
 * Adds a new ingredient input field to the "Add Recipe" form.
 */
function addIngredientField() {
    const list = document.getElementById('ingredients-list');
    if (!list) return;
    const newItem = document.createElement('div');
    newItem.className = 'ingredient-item d-flex mb-2';
    newItem.innerHTML = `
        <input type="text" name="ingredientName" class="form-control me-2" placeholder="Ingredient Name">
        <input type="text" name="ingredientMeasure" class="form-control me-2" placeholder="Quantity (e.g., 1 cup)">
        <button type="button" class="btn btn-danger btn-sm remove-ingredient-btn" aria-label="Remove ingredient">&times;</button>
    `;
    list.appendChild(newItem);
}

// --- Event Listeners ---

/**
 * Sets up global event listeners for the application.
 */
export function setupEventListeners() {
    document.addEventListener('click', async (e) => {
        // Navbar links
        if (e.target.matches('.nav-link[data-query]')) {
            e.preventDefault();
            const { type, query } = e.target.dataset;
            const endpoint = type === 'area' ? `filter.php?a=${query}` : `filter.php?c=${query}`;
            document.getElementById('results-title').textContent = `${query} Dishes`;
            allMeals = await fetchAPI(endpoint);
            applyFiltersAndDisplay();
        }

        // View Recipe Button on Cards
        const recipeCard = e.target.closest('.recipe-card');
        if (recipeCard) {
            await showRecipeDetails(recipeCard.dataset.id);
        }

        // Auth buttons
        if (e.target.matches('#add-recipe-btn')) {
            const addRecipeModal = new bootstrap.Modal(document.getElementById('addRecipeModal'));
            addRecipeModal.show();
        }

        // Modal buttons
        if (e.target.matches('#favorite-btn')) {
            await toggleFavorite();
        }

        // Add/Remove ingredient fields in "Add Recipe" modal
        if (e.target.matches('#add-ingredient-field-btn')) {
            addIngredientField();
        }
        if (e.target.matches('.remove-ingredient-btn')) {
            e.target.closest('.ingredient-item').remove();
        }
    });

    // Keyboard accessibility for recipe cards
    document.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && e.target.matches('.recipe-card')) {
            await showRecipeDetails(e.target.dataset.id);
        }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
        if (e.target.matches('#search-form')) {
            e.preventDefault();
            const query = document.getElementById('search-input').value.trim();
            if (query) {
                window.location.href = `index.html?search=${encodeURIComponent(query)}`;
            }
        }
        if (e.target.matches('#add-recipe-form')) {
            handleSaveRecipe(e);
        }
    });

    // **ENHANCEMENT: Search Bar Clear Button**
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    if (searchInput && searchClearBtn) {
        searchInput.addEventListener('input', () => {
            searchClearBtn.classList.toggle('d-none', !searchInput.value);
        });
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClearBtn.classList.add('d-none');
            searchInput.focus();
        });
    }

    // **FEATURE: Advanced Filters**
    const filterControls = document.querySelector('#advanced-filters');
    if (filterControls) {
        filterControls.addEventListener('change', (e) => {
            const { id, type, value, checked } = e.target;
            if (type === 'checkbox') {
                currentFilters[id.replace('filter-', '')] = checked;
            } else if (type === 'range') {
                currentFilters.maxTime = parseInt(value, 10);
                document.getElementById('time-value').textContent = `${value} mins`;
            } else if (e.target.tagName === 'SELECT') {
                currentFilters.sort = value;
            }
            applyFiltersAndDisplay();
        });
    }

    // Initialize the first ingredient field in the modal
    const addRecipeModalEl = document.getElementById('addRecipeModal');
    if (addRecipeModalEl) {
        addRecipeModalEl.addEventListener('shown.bs.modal', () => {
            const list = document.getElementById('ingredients-list');
            if (list && list.children.length === 0) {
                addIngredientField();
            }
        });
    }
}

/**
 * Applies the current filter state to the `allMeals` array and re-renders the recipes.
 */
function applyFiltersAndDisplay() {
    let filteredMeals = [...allMeals];

    // NOTE: TheMealDB API doesn't support these filters directly.
    // This is a client-side approximation. For a real app, the backend would handle this.
    if (currentFilters.vegetarian) {
        // This is a placeholder. A real implementation would need to check ingredients.
        filteredMeals = filteredMeals.filter(meal => meal.strCategory === 'Vegetarian' || meal.strCategory === 'Vegan');
    }
    if (currentFilters.vegan) {
        filteredMeals = filteredMeals.filter(meal => meal.strCategory === 'Vegan');
    }
    // Gluten-Free and Time filters would require more detailed data than the API provides in its list view.

    // Sorting
    if (currentFilters.sort === 'asc') {
        filteredMeals.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
    } else if (currentFilters.sort === 'desc') {
        filteredMeals.sort((a, b) => b.strMeal.localeCompare(a.strMeal));
    }

    displayRecipes(filteredMeals, 'recipe-results');
}


// --- Pantry Page Specific Logic ---
const ingredientCategories = {
    "👜 Pantry Essentials": ["butter", "egg", "garlic", "milk", "onion", "sugar", "flour", "olive oil", "garlic powder", "white rice", "cinnamon", "ketchup", "soy sauce", "mayonnaise", "vegetable oil", "bread", "baking powder", "brown sugar", "oregano", "potato", "honey", "paprika", "baking soda", "vanilla", "spaghetti", "peanut butter", "chili powder", "cumin", "mustard", "chicken breast", "cheddar", "onion powder", "carrot", "tomato", "basil", "parsley", "parmesan", "italian seasoning", "thyme", "bell pepper"],
    "🥗 Vegetables & Greens": ["garlic", "onion", "bell pepper", "scallion", "carrot", "tomato", "potato", "red onion", "celery", "avocado", "zucchini", "shallot", "cherry tomato", "cucumber", "corn", "spinach", "sweet potato", "broccoli", "baby greens", "pumpkin", "cauliflower", "asparagus", "cabbage", "arugula", "kale", "leek", "lettuce", "eggplant", "butternut squash", "romaine", "beetroot", "brussels sprout", "fennel", "radish"],
    "🥑 Fruits": ["lemon", "lime", "apple", "banana", "orange", "raisins", "mango", "pineapple", "peach", "date", "coconut", "craisins", "pear", "pomegranate", "grape", "watermelon", "rhubarb", "dried apricot", "kiwi", "grapefruit", "plum", "fig", "apricot", "mandarin", "currant", "prunes", "cantaloupe", "sultanas", "passion fruit", "papaya", "tamarind"],
    "🍓 Berries": ["strawberry", "blueberry", "raspberry", "cranberry", "cherry", "blackberry", "berry mix", "dried cherry", "sour cherry", "dried blueberries", "goji berry", "freeze-dried strawberry", "gooseberry", "freeze-dried raspberry", "lingonberry", "acai berry", "mulberry", "amla", "elderberry"],
    "🥩 Meats": ["bacon", "ground beef", "beef steak", "deli ham", "pork chops", "sweet italian sausage", "pork fillet", "prosciutto", "beef roast", "ground pork", "sausage", "pepperoni", "beef stew meat", "chorizo", "pancetta", "pork shoulder", "pork loin", "ground lamb", "smoked sausage", "breakfast sausage", "corned beef", "hot dog"],
    "🍗 Poultry": ["chicken breast", "cooked chicken", "chicken thighs", "boneless skinless chicken thighs", "ground turkey", "whole chicken", "chicken wings", "whole turkey", "chicken leg", "turkey breast", "ground chicken", "rotisserie chicken", "chicken tenders", "turkey sausage", "chicken sausage", "turkey bacon", "duck breast", "deli turkey", "duck"],
    "🐟 Fish": ["salmon", "smoked salmon", "cod", "tilapia", "tuna steak", "halibut", "whitefish", "red snapper", "sea bass", "fish fillets", "trout", "catfish", "swordfish", "surimi", "mahi mahi", "sole", "sardines", "smoked trout", "haddock", "mackerel", "caviar"],
    "🦐 Seafood & Seaweed": ["shrimp", "prawns", "crab", "scallop", "mussel", "clam", "squid", "nori", "lobster", "oyster", "lobster tail", "crawfish", "kombu", "dried shrimp", "bay scallop", "wakame", "soft-shell crab", "baby squid", "king crab", "mixed seafood"],
    "🥛 Dairy & Eggs": ["butter", "egg", "milk", "heavy cream", "sour cream", "buttermilk", "yogurt", "greek yogurt", "cream", "whipped cream", "ghee", "shortening", "half and half", "sweetened condensed milk", "evaporated milk", "ice cream", "margarine", "creme fraiche"],
    "🧀 Cheeses": ["parmesan", "cream cheese", "cheddar", "mozzarella", "feta", "sharp cheddar", "ricotta", "monterey jack", "blue cheese", "goat cheese", "fresh mozzarella", "swiss cheese", "pecorino", "gruyere", "mascarpone", "american cheese", "cottage cheese", "provolone"],
    "🌱 Dairy-Free & Meat Substitutes": ["coconut milk", "almond milk", "almond butter", "tofu", "vegan butter", "non-dairy milk", "coconut cream", "soy milk", "extra firm tofu", "silken tofu", "kala namak salt", "coconut butter", "egg replacer", "vegan mayonnaise", "cashew butter", "vegan parmesan"],
    "🧁 Baking": ["flour", "baking powder", "baking soda", "cornstarch", "yeast", "dark chocolate chips", "chocolate chips", "whole-wheat flour", "shredded coconut", "almond flour", "self-raising flour", "cornmeal", "pastry flour", "coconut flake", "coconut flour", "cream of tartar"],
    "🌾 Grains & Cereals": ["rolled oats", "white rice", "quinoa", "brown rice", "long-grain rice", "basmati", "quick-cooking oats", "cooked rice", "breakfast cereal", "risotto rice", "rice cereal", "couscous", "wild rice", "semolina", "jasmine rice", "polenta", "granola cereal", "bulgur"],
    "🍝 Pasta": ["short-cut pasta", "spaghetti", "macaroni", "egg noodle", "spiral pasta", "lasagna", "linguine", "fettuccine", "orzo", "pasta shell", "bow-tie pasta", "tortellini", "noodle", "rice noodles", "rigatoni", "gnocchi", "angel hair pasta", "ramen noodles"],
    "🍞 Bread & Salty Snacks": ["bread", "bread crumbs", "panko", "flour tortillas", "corn tortillas", "crackers", "baguette", "tortilla chips", "pita", "pretzels", "seasoned bread crumbs", "sourdough bread", "rustic italian bread", "popcorn", "croutons", "whole-wheat tortillas"],
    "🌭 Pre-Made Doughs & Wrappers": ["pie crust", "puff pastry", "pizza crust", "biscuit dough", "refrigerated crescent rolls", "phyllo", "dumpling wrapper", "graham cracker crust", "cookie dough", "sourdough starter", "rice paper", "egg roll wrapper", "cinnamon roll dough"],
    "🥜 Nuts & Seeds": ["pecan", "walnut", "almond", "sesame seed", "cashew", "pine nut", "pistachio", "peanut", "chia", "slivered almonds", "pumpkin seeds", "hazelnut", "poppy seed", "sunflower seeds", "flax", "chopped nuts", "macadamia", "roasted peanuts"],
    "🫛 Legumes": ["peas", "green beans", "black beans", "chickpea", "white beans", "lentils", "kidney beans", "snow peas", "snap peas", "red lentils", "bean sprouts", "edamame", "cannellini beans", "pinto beans", "green lentils", "urad dal", "chana dal"],
    "🍄 Mushrooms": ["button mushroom", "shiitake mushroom", "portobello mushroom", "wild mushroom", "porcini", "oyster mushroom", "mixed mushrooms", "chestnut mushroom", "enoki mushroom", "black fungus", "morel mushrooms", "black truffle", "straw mushroom"],
    "🌿 Herbs & Spices": ["cinnamon", "parsley", "cilantro", "cumin", "basil", "thyme", "ginger root", "garlic powder", "oregano", "nutmeg", "jalapeno", "chili flake", "chili powder", "paprika", "cayenne", "rosemary", "bay leaf", "turmeric", "clove"],
    "🌶️ Seasonings & Spice Blends": ["italian seasoning", "seasoned salt", "curry", "garam masala", "pumpkin pie spice", "taco seasoning", "cajun seasoning", "dry ranch seasoning", "white miso", "himalayan salt", "seafood seasoning", "lemon & pepper seasoning", "liquid smoke"],
    "🍾 Oils & Fats": ["olive oil", "vegetable oil", "extra virgin olive oil", "canola oil", "coconut oil", "cooking spray", "sesame oil", "frying oil", "sunflower oil", "avocado oil", "toasted sesame oil", "peanut oil", "grapeseed oil", "pork fat", "lard"],
    "🥗 Dressings & Vinegars": ["mayonnaise", "apple cider vinegar", "balsamic vinegar", "vinegar", "red wine vinegar", "rice wine vinegar", "white wine vinegar", "ranch dressing", "italian dressing", "sherry vinegar", "distilled white vinegar", "white balsamic vinegar"],
    "🥫 Condiments": ["soy sauce", "dijon mustard", "worcestershire", "hot sauce", "ketchup", "mustard", "fish sauce", "bbq sauce", "sriracha", "wholegrain mustard", "tamari", "ginger-garlic paste", "oyster sauce", "chili sauce", "brown mustard"],
    "🥫 Canned Food": ["canned tomato", "capers", "canned chickpea", "green olives", "black olives", "canned black beans", "canned pumpkin", "canned pineapple", "kalamata olives", "canned tuna", "pickle", "chipotle in adobo", "roasted red peppers"],
    "🥣 Sauces, Spreads & Dips": ["tomato paste", "peanut butter", "tomato sauce", "salsa", "tahini", "pesto", "pasta sauce", "marinara sauce", "hoisin sauce", "enchilada sauce", "pico de gallo", "guacamole", "hummus", "salsa verde", "alfredo sauce"],
    "🍲 Soups, Stews & Stocks": ["chicken broth", "vegetable broth", "chicken stock", "beef broth", "beef stock", "bouillon cube", "cream of mushroom", "cream of chicken", "onion soup mix", "tomato soup", "fish stock", "cream of celery", "clam juice"],
    "🍫 Desserts & Sweet Snacks": ["natural cocoa", "dark chocolate", "marshmallow", "applesauce", "gelatin", "graham cracker crumbs", "graham cracker", "white chocolate", "sandwich cookies", "instant pudding", "cookies", "chocolate hazelnut spread"],
    "🍯 Sugar & Sweeteners": ["sugar", "brown sugar", "confectioners' sugar", "honey", "maple syrup", "dark brown sugar", "corn syrup", "coconut sugar", "molasses", "stevia", "agave nectar", "sugar syrup", "erythritol", "vanilla sugar"],
    "🍷 Wine, Beer & Spirits": ["white wine", "red wine", "whisky", "rum", "vodka", "beer", "orange liqueur", "cider", "sherry", "tequila", "gin", "brandy", "bitters", "mirin", "white rum", "shaoxing wine"],
    "🥤 Beverages": ["orange juice", "coffee", "club soda", "pineapple juice", "apple juice", "espresso powder", "tea", "cranberry juice", "espresso", "tomato juice", "coconut water", "pomegranate juice", "matcha powder"],
    "💊 Supplements & Extracts": ["almond extract", "food coloring", "nutritional yeast", "peppermint extract", "lemon extract", "vegan protein powder", "coconut extract", "rose water", "orange extract", "whey protein powder", "rum extract", "maple extract"]
};
let selectedIngredients = [];

export function createAccordion() {
    const ingredientAccordion = document.getElementById('ingredientAccordion');
    if (!ingredientAccordion) return;

    let accordionHTML = '';
    let index = 0;
    for (const category in ingredientCategories) {
        const categoryId = `category-${index}`;
        const ingredients = ingredientCategories[category];

        const badgesHTML = ingredients.map(ing => `<span class="badge ingredient-badge" role="button" tabindex="0">${ing}</span>`).join('');

        accordionHTML += `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading-${categoryId}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${categoryId}" aria-expanded="false" aria-controls="collapse-${categoryId}">
                        ${category}
                    </button>
                </h2>
                <div id="collapse-${categoryId}" class="accordion-collapse collapse" aria-labelledby="heading-${categoryId}" data-bs-parent="#ingredientAccordion">
                    <div class="accordion-body d-flex flex-wrap">
                        ${badgesHTML}
                    </div>
                </div>
            </div>`;
        index++;
    }
    ingredientAccordion.innerHTML = accordionHTML;
}

function renderSelectedIngredients() {
    const container = document.getElementById('selected-ingredients-container');
    if (!container) return;

    if (selectedIngredients.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Your ingredients will appear here.</p>';
    } else {
        container.innerHTML = selectedIngredients.map(ingredient => `
            <span class="badge text-bg-primary me-2 mb-2">
                ${ingredient}
                <button type="button" class="btn-close btn-close-white" aria-label="Remove ${ingredient}" data-ingredient="${ingredient}"></button>
            </span>
        `).join('');
    }
}

function addIngredient(ingredient) {
    const cleanedIngredient = ingredient.trim().toLowerCase();
    if (cleanedIngredient && !selectedIngredients.includes(cleanedIngredient)) {
        selectedIngredients.push(cleanedIngredient);
        renderSelectedIngredients();
    }
}

function removeIngredient(ingredient) {
    selectedIngredients = selectedIngredients.filter(item => item !== ingredient);
    renderSelectedIngredients();
}

export function setupPantryEventListeners() {
    const addIngredientForm = document.getElementById('add-ingredient-form');
    const ingredientInput = document.getElementById('ingredient-input');
    const findRecipesBtn = document.getElementById('find-recipes-btn');

    if (addIngredientForm) {
        addIngredientForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newIngredient = ingredientInput.value;
            if (newIngredient) {
                addIngredient(newIngredient);
                ingredientInput.value = '';
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-ingredient]')) {
            removeIngredient(e.target.dataset.ingredient);
        }
        if (e.target.matches('.ingredient-badge')) {
            addIngredient(e.target.textContent);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('.ingredient-badge')) {
            addIngredient(e.target.textContent);
        }
    });

    if (findRecipesBtn) {
        findRecipesBtn.addEventListener('click', async () => {
            if (selectedIngredients.length === 0) {
                showToast("Please add some ingredients first!", "error");
                return;
            }
            const pantryResultsSection = document.getElementById('pantry-results-section');
            pantryResultsSection.classList.remove('d-none');

            // **ENHANCEMENT: Cohesive Pantry Experience**
            // Fetch and display results directly on the page.
            const meals = await fetchRecipesByIngredients(selectedIngredients);
            displayRecipes(meals, 'pantry-recipe-results');
        });
    }

    renderSelectedIngredients();
}
