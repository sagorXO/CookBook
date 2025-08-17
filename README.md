Cookbook 🍳
Welcome to Cookbook, a modern, interactive web application designed for food enthusiasts! Discover thousands of recipes, save your favorites, create your own, and even find meals you can make with the ingredients you already have.

✨ Features
Recipe Discovery: Search a massive database of recipes from around the world using TheMealDB API.

Secure User Accounts: Full user authentication powered by Firebase, allowing users to sign up, log in, and securely manage their data.

Personal Collections: Logged-in users can save their favorite recipes and add their own custom recipes. All data is stored securely in Firestore.

"Cooking Hacks" (Pantry Feature): Add the ingredients you have on hand, and the app will suggest recipes you can make.

Halal/Haram Ingredient Checker: An integrated feature that identifies potentially non-halal ingredients and suggests substitutes.

Responsive Design: A beautiful and intuitive interface built with Bootstrap that works seamlessly on desktops, tablets, and mobile devices.

Dark/Light Theme: A sleek theme-switcher for comfortable viewing in any lighting condition.

🛠️ Tech Stack
Frontend: HTML5, CSS3, JavaScript (ES6 Modules)

Frameworks/Libraries: Bootstrap 5

Backend & Database: Google Firebase

Firebase Authentication for secure user management.

Cloud Firestore for persistent data storage (favorites, user recipes).

APIs: TheMealDB API for recipe data.

🚀 Getting Started
To run this project locally, you just need a modern web browser.

Clone the repository:

git clone [https://github.com/your-username/cookbook.git](https://github.com/your-username/cookbook.git)

Navigate to the project directory:

cd cookbook

Open index.html in your browser.

You can do this by right-clicking the file and selecting "Open with..." or by using a simple local server like the Live Server extension for VS Code.

🔐 Firebase Configuration
This project requires a Firebase project to handle authentication and database storage.

Create a project at the Firebase Console.

Add a new Web App to your project.

Enable Email/Password authentication in the Authentication > Sign-in method tab.

Create a Cloud Firestore database and set up the security rules (see below).

Copy your Firebase configuration object and paste it into assets/js/modules/firebase.js.

Firestore Security Rules
For security, it's crucial to set up rules that prevent users from accessing each other's data. Navigate to Firestore Database > Rules in your Firebase console and use the following:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read and write their own data document,
    // which is identified by their unique user ID (uid).
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

📂 Project Structure
The project is organized into a modular structure for better maintainability and scalability.

Cookbook/
├── index.html
├── pantry.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── images/
│   └── js/
│       ├── main.js         # Main entry point for index.html
│       ├── pantry.js       # Main entry point for pantry.html
│       └── modules/
│           ├── api.js
│           ├── auth.js
│           ├── firebase.js
│           ├── theme.js
│           └── ui.js
└── README.md
