// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// TODO: Replace this with your actual config from the Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyCVp9oP0-KxQJ4GWr3sGabCVwI-1XCkIvs",
  authDomain: "flytogether-69521.firebaseapp.com",
  projectId: "flytogether-69521",
  storageBucket: "flytogether-69521.firebasestorage.app",
  messagingSenderId: "18068443242",
  appId: "1:18068443242:web:540396d942c87e7a71ba13",
  measurementId: "G-EB1Y481KY8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
//const analytics = getAnalytics(app);
const functions = getFunctions(app);
//const db = getFirestore(app);
if (window.location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
export { auth };
