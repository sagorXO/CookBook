import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { auth } from './firebase.js';
import { loadUserRecipes, loadFavorites } from './ui.js';

/**
 * Sets up the authentication UI based on user login status.
 * @param {HTMLElement} container - The container for the auth UI.
 * @param {object|null} user - The Firebase user object.
 */
export function setupAuthUI(container, user) {
    if (!container) return;

    if (user) {
        // User is logged in
        const displayName = user.displayName || user.email.split('@')[0];
        container.innerHTML = `
            <button id="add-recipe-btn" class="btn btn-primary me-2" aria-label="Add a new recipe">➕ Add Recipe</button>
            <div class="dropdown">
                <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Welcome, ${displayName}!
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" id="logout-btn" href="#">Logout</a></li>
                </ul>
            </div>`;
        const userSections = document.getElementById('user-sections');
        if (userSections) {
            userSections.innerHTML = `
                <section id="my-recipes-section" class="d-none" aria-labelledby="my-recipes-title">
                    <h2 id="my-recipes-title" class="section-title">📖 My Recipes</h2>
                    <div id="my-recipes-container" class="row g-4"></div>
                    <hr class="my-5">
                </section>
                <section id="favorites-section" class="d-none" aria-labelledby="favorites-title">
                    <h2 id="favorites-title" class="section-title">⭐ Favorite Recipes</h2>
                    <div id="favorites-container" class="row g-4"></div>
                    <hr class="my-5">
                </section>`;
            loadUserRecipes(user.uid);
            loadFavorites(user.uid);
        }
    } else {
        // User is logged out
        container.innerHTML = `<button id="login-show-btn" class="btn btn-outline-primary">Login / Sign Up</button>`;
        const userSections = document.getElementById('user-sections');
        if (userSections) {
            userSections.innerHTML = '';
        }
    }
}

/**
 * Handles authentication-related events.
 */
export function handleAuth() {
    const loginModalEl = document.getElementById('loginModal');
    if (!loginModalEl) return;
    const loginModal = new bootstrap.Modal(loginModalEl);

    const handleProviderSignIn = (provider) => {
        signInWithPopup(auth, provider)
            .then(() => loginModal.hide())
            .catch(error => {
                document.getElementById('auth-error').textContent = error.message;
            });
    };

    document.addEventListener('click', (e) => {
        if (e.target.matches('#login-show-btn')) {
            loginModal.show();
        }
        if (e.target.matches('#logout-btn')) {
            signOut(auth).catch(error => console.error("Logout failed:", error));
        }
        if (e.target.matches('#google-signin-btn')) {
            handleProviderSignIn(new GoogleAuthProvider());
        }
        if (e.target.matches('#facebook-signin-btn')) {
            handleProviderSignIn(new FacebookAuthProvider());
        }
        if (e.target.matches('#auth-toggle-link')) {
            e.preventDefault();
            toggleAuthMode();
        }
    });

    const loginForm = document.getElementById('login-form');
    let isSignUp = false; // Start in login mode

    function toggleAuthMode() {
        isSignUp = !isSignUp;
        const modalTitle = document.getElementById('loginModalLabel');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const toggleLink = document.getElementById('auth-toggle-link');
        
        modalTitle.textContent = isSignUp ? 'Sign Up' : 'Login';
        submitButton.textContent = isSignUp ? 'Sign Up' : 'Login';
        toggleLink.textContent = isSignUp ? 'Already have an account? Login' : 'Need an account? Sign up';
        document.getElementById('auth-error').textContent = '';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const authError = document.getElementById('auth-error');
            authError.textContent = '';
            const email = loginForm.email.value;
            const password = loginForm.password.value;

            try {
                if (isSignUp) {
                    await createUserWithEmailAndPassword(auth, email, password);
                } else {
                    await signInWithEmailAndPassword(auth, email, password);
                }
                loginModal.hide();
            } catch (error) {
                console.error("Authentication error:", error.message);
                authError.textContent = error.message;
            }
        });
    }
}
