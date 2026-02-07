import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// YOUR SPECIFIC CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDYX7PzWDY20xtgUHi9alqI7WcxzvFE6Ao",
  authDomain: "nxus-tracker.firebaseapp.com",
  projectId: "nxus-tracker",
  storageBucket: "nxus-tracker.firebasestorage.app",
  messagingSenderId: "1093056988911",
  appId: "1:1093056988911:web:426a5a5b7cd2a0d36ffd1a",
  measurementId: "G-S758JXL79M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const loginBtn = document.getElementById('google-login-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => {
                const user = result.user;
                console.log("Logged in:", user.displayName);
                window.location.href = "index.html"; 
            })
            .catch((error) => {
                console.error("Login Failed:", error);
                alert("Login failed: " + error.message);
            });
    });
}