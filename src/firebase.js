import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5uFPOodD-28XhIKXVa9zC-u3UeAXm7DE",
  authDomain: "hr-onboarding-sytem.firebaseapp.com",
  projectId: "hr-onboarding-sytem",
  storageBucket: "hr-onboarding-sytem.firebasestorage.app",
  messagingSenderId: "1082943344002",
  appId: "1:1082943344002:web:3e61aff73fb1f4d468939b",
  measurementId: "G-JVDS11B9VY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
