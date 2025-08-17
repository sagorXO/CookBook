// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1i3mGOp9XZYhr483OA421HJUK7pWfaH4",
  authDomain: "cookbook-35f04.firebaseapp.com",
  projectId: "cookbook-35f04",
  storageBucket: "cookbook-35f04.appspot.com",
  messagingSenderId: "1074696284025",
  appId: "1:1074696284025:web:a1d3200a929ce1bda8b1a8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services for use in other modules
export const auth = getAuth(app);
export const db = getFirestore(app);
